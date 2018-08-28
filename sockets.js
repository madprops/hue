var handler = function(io, db_manager, config, sconfig, utilz, logger)
{
	handler.public = {}

	const fs = require('fs')
	const path = require('path')
	const SocketAntiSpam = require('socket-anti-spam')
	const fetch = require('node-fetch')
	const mongo = require('mongodb')
	const aws = require('aws-sdk')
	const jwt = require('jsonwebtoken')
	const soundcloud = require('node-soundcloud')
	const image_dimensions = require('image-size');

	soundcloud.init(
	{
		id: `${sconfig.soundcloud_id}`,
		secret: `${sconfig.soundcloud_secret}`
	})

	const images_root = path.join(__dirname, config.images_directory)

	const vtypes = ["voice1", "voice2", "voice3", "voice4"]
	const roles = ["admin", "op"].concat(vtypes)
	const image_types = ["image/jpeg", "image/png", "image/gif"]
	const image_extensions = ["jpg", "jpeg", "png", "gif"]
	const reaction_types = ["like", "love", "happy", "meh", "sad", "dislike"]
	const media_types = ["images", "tv", "radio", "voice_chat"]

	const s3 = new aws.S3(
	{
		apiVersion: sconfig.s3_api_version,
		endpoint: sconfig.s3_endpoint_url,
		credentials:
		{
			accessKeyId: sconfig.s3_access_key,
			secretAccessKey: sconfig.s3_secret_access_key
		}
	})

	const rooms = {}
	const user_rooms = {}
	const files = {}

	const files_struct =
	{
		action: null,
		name: null,
		type: null,
		size: 0,
		data: [],
		slice: 0,
		date: null,
		updated: null,
		received: 0,
		extension: null,
		cancelled: false,
		spsize: 0
	}

	var last_roomlist
	var roomlist_lastget = 0

	const antiSpam = new SocketAntiSpam(
	{
		banTime: config.antispam_banTime, // Ban time in minutes
		kickThreshold: config.antispam_kickThreshold, // User gets kicked after this many spam score
		kickTimesBeforeBan: config.antispam_kickTimesBeforeBan, // User gets banned after this many kicks
		banning: config.antispam_banning, // Uses temp IP banning after kickTimesBeforeBan
		heartBeatStale: config.antispam_heartBeatStale, // Removes a heartbeat after this many seconds
		heartBeatCheck: config.antispam_heartBeatCheck, // Checks a heartbeat per this many seconds
	})

	antiSpam.event.on('ban', function(socket, data)
	{
		socket.hue_kicked = true
		socket.hue_info1 = "the anti-spam system"
		handler.get_out(socket)
	})

	const dont_check_joined = ["join_room", "roomlist", "create_room"]
	const dont_add_spam = ["slice_upload", "typing", "voice_chat_blob"]
	const check_locked = ["roomlist", "create_room"]

	io.on("connection", async function(socket)
	{
		try
		{
			var spam_ans = await handler.add_spam(socket)

			if(!spam_ans)
			{
				return false
			}

			handler.connection(socket)
		}

		catch(err)
		{
			logger.log_error(err)
		}

		socket.on('server_method', async function(data)
		{
			try
			{
				if(!handler.check_data(data))
				{
					return handler.get_out(socket)
				}

				var m = data.server_method_name

				if(handler.public[m] === undefined)
				{
					return handler.get_out(socket)
				}

				if(m === undefined)
				{
					return handler.get_out(socket)
				}

				if(!data || typeof data !== "object")
				{
					return handler.get_out(socket)
				}

				if(!dont_check_joined.includes(m))
				{
					if(!socket.hue_joined)
					{
						return handler.get_out(socket)
					}
				}

				else
				{
					if(check_locked.includes(m))
					{
						if(!socket.hue_joined)
						{
							if(!socket.hue_locked)
							{
								return handler.get_out(socket)
							}
						}
					}
				}

				if(!dont_add_spam.includes(m))
				{
					var spam_ans = await handler.add_spam(socket)

					if(!spam_ans)
					{
						return false
					}
				}

				handler.public[m](socket, data)
			}

			catch(err)
			{
				logger.log_error(err)
			}
		})

		socket.on('disconnect', function(reason)
		{
			try
			{
				reason = reason.toLowerCase()

				if(reason.includes('timeout'))
				{
					socket.hue_pinged = true
				}

				handler.disconnect(socket)
			}

			catch(err)
			{
				logger.log_error(err)
			}
		})
	})

	handler.connection = function(socket)
	{
		socket.hue_pinged = false
		socket.hue_kicked = false
		socket.hue_banned = false
		socket.hue_joining = false
		socket.hue_joined = false
		socket.hue_superuser = false
		socket.hue_locked = false
		socket.hue_info1 = ""
		socket.hue_typing_counter = 0
		socket.hue_voice_chat_counter = 0
	}

	handler.public.join_room = async function(socket, data)
	{
		if(socket.hue_joining || socket.hue_joined)
		{
			return false
		}

		if(data.room_id === undefined)
		{
			return handler.do_disconnect(socket)
		}

		if(data.room_id.length > config.max_room_id_length)
		{
			return handler.do_disconnect(socket)
		}

		if(data.alternative)
		{
			data.email = data.email.trim()
			data.password = data.password.trim()

			if(data.email === undefined || data.password === undefined)
			{
				return handler.do_disconnect(socket)
			}

			if(data.email > config.max_max_email_length)
			{
				return handler.do_disconnect(socket)
			}

			if(data.password.length > config.max_max_password_length)
			{
				return handler.do_disconnect(socket)
			}
		}

		else
		{
			data.user_id = data.user_id.trim()

			if(data.user_id === undefined || data.token === undefined)
			{
				return handler.do_disconnect(socket)
			}

			if(data.user_id > config.max_user_id_length)
			{
				return handler.do_disconnect(socket)
			}

			if(data.token.length > config.max_jwt_token_length)
			{
				return handler.do_disconnect(socket)
			}
		}

		if(data.alternative)
		{
			var ans = await db_manager.check_password(data.email, data.password,
			{
				email: true,
				username: true,
				profile_image: true,
				registration_date: true
			})

			if(!ans.valid)
			{
				return handler.do_disconnect(socket)
			}

			var userinfo = ans.user

			socket.hue_user_id = userinfo._id.toString()

			var info = await db_manager.get_room({_id:data.room_id}, {})

			if(!info)
			{
				return handler.do_disconnect(socket)
			}

			handler.do_join(socket, info, userinfo)

			db_manager.save_visited_room(socket.hue_user_id, data.room_id)
		}

		else
		{
			jwt.verify(data.token, sconfig.jwt_secret, async function(err, decoded)
			{
				if(err)
				{
					return handler.do_disconnect(socket)
				}

				else if(decoded.data === undefined || decoded.data.id === undefined)
				{
					return handler.do_disconnect(socket)
				}

				if(decoded.data.id !== data.user_id)
				{
					return handler.do_disconnect(socket)
				}

				else
				{
					socket.hue_user_id = data.user_id

					var info = await db_manager.get_room({_id:data.room_id}, {})

					if(!info)
					{
						return handler.do_disconnect(socket)
					}

					var userinfo = await db_manager.get_user({_id:socket.hue_user_id},
					{
						email: true,
						username: true,
						profile_image: true,
						registration_date: true
					})

					if(!userinfo)
					{
						return handler.do_disconnect(socket)
					}

					handler.do_join(socket, info, userinfo)

					db_manager.save_visited_room(socket.hue_user_id, data.room_id)
				}
			})
		}
	}

	handler.do_join = function(socket, info, userinfo)
	{
		socket.hue_room_id = info._id.toString()
		socket.hue_email = userinfo.email
		socket.hue_joining = true

		socket.join(socket.hue_room_id)

		if(handler.check_multipe_joins(socket))
		{
			return handler.do_disconnect(socket)
		}

		if(sconfig.superuser_emails.includes(userinfo.email))
		{
			socket.hue_superuser = true
		}

		socket.hue_username = userinfo.username

		socket.hue_ip = socket.client.request.headers['x-forwarded-for'] || socket.client.conn.remoteAddress

		if(!socket.hue_superuser && info.bans.includes(socket.hue_user_id))
		{
			socket.leave(socket.hue_room_id)
			socket.hue_locked = true

			handler.user_emit(socket, 'joined',
			{
				room_locked: true
			})

			return false
		}

		if(userinfo.profile_image === "")
		{
			socket.hue_profile_image = ""
		}

		else if(!userinfo.profile_image.includes(sconfig.s3_main_url))
		{
			socket.hue_profile_image = config.public_images_location + userinfo.profile_image
		}

		else
		{
			socket.hue_profile_image = userinfo.profile_image
		}

		if(info.background_image === "")
		{
			var background_image = ""
		}

		else if(info.background_image_type === "hosted")
		{
			if(!info.background_image.includes(sconfig.s3_main_url))
			{
				var background_image = config.public_images_location + info.background_image
			}

			else
			{
				var background_image = info.background_image
			}
		}

		else
		{
			var background_image = info.background_image
		}

		if(rooms[socket.hue_room_id] === undefined)
		{
			rooms[socket.hue_room_id] = handler.create_room_object(info)
		}

		socket.hue_role = info.keys[socket.hue_user_id]

		if(!roles.includes(socket.hue_role))
		{
			socket.hue_role = 'voice1'
		}

		if(user_rooms[socket.hue_user_id] === undefined)
		{
			user_rooms[socket.hue_user_id] = []
		}

		if(!user_rooms[socket.hue_user_id].includes(socket.hue_room_id))
		{
			user_rooms[socket.hue_user_id].push(socket.hue_room_id)
		}

		var already_connected = handler.user_already_connected(socket)

		if(!already_connected)
		{
			rooms[socket.hue_room_id].userlist[socket.hue_user_id] = {}
			handler.update_user_in_userlist(socket)
		}

		socket.hue_joining = false
		socket.hue_joined = true

		handler.user_emit(socket, 'joined',
		{
			room_locked: false,
			room_name: info.name,
			username: socket.hue_username,
			image_source: info.image_source,
			image_setter: info.image_setter,
			image_size: info.image_size,
			image_date: info.image_date,
			image_type: info.image_type,
			topic: info.topic,
			topic_setter: info.topic_setter,
			topic_date: info.topic_date,
			userlist: handler.prepare_userlist(handler.get_userlist(socket.hue_room_id)),
			voice_chat_userlist: handler.prepare_voice_chat_userlist(rooms[socket.hue_room_id].voice_chat_sockets),
			log: info.log,
			log_messages: info.log_messages.concat(rooms[socket.hue_room_id].log_messages),
			role: socket.hue_role,
			public: info.public,
			radio_type: info.radio_type,
			radio_source: info.radio_source,
			radio_title: info.radio_title,
			radio_setter: info.radio_setter,
			radio_date: info.radio_date,
			tv_type: info.tv_type,
			tv_source: info.tv_source,
			tv_title: info.tv_title,
			tv_setter: info.tv_setter,
			tv_date: info.tv_date,
			profile_image: socket.hue_profile_image,
			room_images_mode: info.images_mode,
			room_tv_mode: info.tv_mode,
			room_radio_mode: info.radio_mode,
			room_voice_chat_mode: info.voice_chat_mode,
			theme: info.theme,
			background_image: background_image,
			background_image_setter: info.background_image_setter,
			background_image_date: info.background_image_date,
			background_mode: info.background_mode,
			background_tile_dimensions: info.background_tile_dimensions,
			text_color_mode: info.text_color_mode,
			text_color: info.text_color,
			voice1_chat_permission: info.voice1_chat_permission,
			voice1_images_permission: info.voice1_images_permission,
			voice1_tv_permission: info.voice1_tv_permission,
			voice1_radio_permission: info.voice1_radio_permission,
			voice1_voice_chat_permission: info.voice1_voice_chat_permission,
			voice2_chat_permission: info.voice2_chat_permission,
			voice2_images_permission: info.voice2_images_permission,
			voice2_tv_permission: info.voice2_tv_permission,
			voice2_radio_permission: info.voice2_radio_permission,
			voice2_voice_chat_permission: info.voice2_voice_chat_permission,
			voice3_chat_permission: info.voice3_chat_permission,
			voice3_images_permission: info.voice3_images_permission,
			voice3_tv_permission: info.voice3_tv_permission,
			voice3_radio_permission: info.voice3_radio_permission,
			voice3_voice_chat_permission: info.voice3_voice_chat_permission,
			voice4_chat_permission: info.voice4_chat_permission,
			voice4_images_permission: info.voice4_images_permission,
			voice4_tv_permission: info.voice4_tv_permission,
			voice4_radio_permission: info.voice4_radio_permission,
			voice4_voice_chat_permission: info.voice4_voice_chat_permission,
			email: socket.hue_email,
			reg_date: userinfo.registration_date
		})

		if(!already_connected)
		{
			handler.broadcast_emit(socket, 'userjoin',
			{
				user_id: socket.hue_user_id,
				username: socket.hue_username,
				role: socket.hue_role,
				profile_image: socket.hue_profile_image
			})
		}
	}

	handler.public.sendchat = function(socket, data)
	{
		if(data.message === undefined)
		{
			return handler.get_out(socket)
		}

		if(data.message.length === 0)
		{
			return handler.get_out(socket)
		}

		if(data.message.length > config.max_input_length)
		{
			return handler.get_out(socket)
		}

		if(data.message !== utilz.clean_string10(data.message))
		{
			return handler.get_out(socket)
		}

		if(data.message.split("\n").length > config.max_num_newlines)
		{
			return handler.get_out(socket)
		}		

		if(!handler.check_permission(socket, "chat"))
		{
			return false
		}

		var date = Date.now()

		handler.room_emit(socket, 'chat_message',
		{
			username: socket.hue_username,
			message: data.message,
			profile_image: socket.hue_profile_image,
			date: date
		})

		rooms[socket.hue_room_id].activity = true

		rooms[socket.hue_room_id].modified = Date.now()

		if(rooms[socket.hue_room_id].log)
		{
			var message =
			{
				type: "chat",
				data:
				{
					username: socket.hue_username,
					content: data.message,
					profile_image: socket.hue_profile_image
				},
				date: date
			}

			rooms[socket.hue_room_id].log_messages.push(message)
		}
	}

	handler.public.change_topic = async function(socket, data)
	{
		if(!handler.is_admin_or_op(socket))
		{
			return handler.get_out(socket)
		}

		if(data.topic === undefined)
		{
			return handler.get_out(socket)
		}

		if(data.topic.length === 0)
		{
			return handler.get_out(socket)
		}

		if(data.topic.length > config.max_topic_length)
		{
			return handler.get_out(socket)
		}

		if(data.topic !== utilz.clean_string2(data.topic))
		{
			return handler.get_out(socket)
		}

		var info = await db_manager.get_room({_id:socket.hue_room_id}, {topic:true})

		var new_topic = data.topic

		if(new_topic !== info.topic)
		{
			info.topic = new_topic
			info.topic_setter = socket.hue_username
			info.topic_date = Date.now()

			handler.room_emit(socket, 'topic_change',
			{
				topic: info.topic,
				topic_setter: info.topic_setter,
				topic_date: info.topic_date
			})

			db_manager.update_room(info._id,
			{
				topic: info.topic,
				topic_setter: info.topic_setter,
				topic_date: info.topic_date
			})

			rooms[socket.hue_room_id].topic = info.topic

			handler.push_admin_log_message(socket, `changed the topic to "${info.topic}"`)
		}
	}

	handler.public.change_room_name = async function(socket, data)
	{
		if(!handler.is_admin_or_op(socket))
		{
			return handler.get_out(socket)
		}

		if(data.name.length === 0 || data.name.length > config.max_room_name_length)
		{
			return handler.get_out(socket)
		}

		if(data.name !== utilz.clean_string2(data.name))
		{
			return handler.get_out(socket)
		}

		var info = await db_manager.get_room({_id:socket.hue_room_id}, {name:true})

		if(info.name !== data.name)
		{
			info.name = data.name

			handler.room_emit(socket, 'room_name_changed',
			{
				name: info.name,
				username: socket.hue_username
			})

			db_manager.update_room(info._id,
			{
				name: info.name
			})

			rooms[socket.hue_room_id].name = info.name

			handler.push_admin_log_message(socket, `changed the room name to "${info.name}"`)
		}
	}

	handler.public.roomlist = function(socket, data)
	{
		if(data.type === "visited_roomlist")
		{
			handler.get_visited_roomlist(socket.hue_user_id, function(rooms)
			{
				handler.user_emit(socket, 'roomlist', {roomlist:rooms, rtype:data.type})
			})
		}

		else if(data.type === "public_roomlist")
		{
			handler.get_roomlist(function(rooms)
			{
				handler.user_emit(socket, 'roomlist', {roomlist:rooms, rtype:data.type})
			})
		}

		else
		{
			return handler.get_out(socket)
		}
	}

	handler.public.create_room = async function(socket, data)
	{
		if(data.name.length === 0 || data.name.length > config.max_room_name_length)
		{
			return handler.get_out(socket)
		}

		if(data.name !== utilz.clean_string2(data.name))
		{
			return handler.get_out(socket)
		}

		if(data.public !== true && data.public !== false)
		{
			return handler.get_out(socket)
		}

		data.user_id = socket.hue_user_id

		if(socket.hue_superuser)
		{
			var force = true
		}

		else
		{
			var force = false
		}

		var ans = await db_manager.user_create_room(data, force)

		if(ans === "wait")
		{
			handler.user_emit(socket, 'create_room_wait', {})
			return
		}

		handler.user_emit(socket, 'room_created', {id:ans._id.toString()})
	}

	handler.public.change_role = async function(socket, data)
	{
		if(!socket.hue_superuser && (!handler.is_admin_or_op(socket)))
		{
			return handler.get_out(socket)
		}

		if(data.username === undefined)
		{
			return handler.get_out(socket)
		}

		if(data.username.length === 0)
		{
			return handler.get_out(socket)
		}

		if(data.username.length > config.max_max_username_length)
		{
			return handler.get_out(socket)
		}

		if(!roles.includes(data.role))
		{
			return handler.get_out(socket)
		}

		if(!socket.hue_superuser && (socket.hue_username === data.username))
		{
			return handler.get_out(socket)
		}

		var info = await db_manager.get_room({_id:socket.hue_room_id}, {keys:true})

		var userinfo = await db_manager.get_user({username:data.username}, {username:true})

		if(!userinfo)
		{
			handler.user_emit(socket, 'user_not_found', {})
			return false
		}

		var id = userinfo._id.toString()

		var current_role = info.keys[id]

		if(!socket.hue_superuser)
		{
			if((current_role === 'admin' || current_role === 'op') && socket.hue_role !== 'admin')
			{
				handler.user_emit(socket, 'forbiddenuser', {})
				return false
			}
		}

		if(current_role === data.role || (current_role === undefined && data.role === "voice1"))
		{
			handler.user_emit(socket, 'isalready', {what:data.role, who:data.username})
			return false
		}

		var sockets = handler.get_user_sockets_per_room(socket.hue_room_id, id)

		var last_socc = false

		for(var socc of sockets)
		{
			if(socc.hue_superuser)
			{
				if(socket.hue_username !== socc.hue_username && socc.hue_role === "admin")
				{
					handler.user_emit(socket, 'forbiddenuser', {})
					return false
				}
			}

			socc.hue_role = data.role
			last_socc = socc
		}

		if(last_socc)
		{
			handler.update_user_in_userlist(last_socc)
		}

		info.keys[id] = data.role

		db_manager.update_room(info._id, {keys:info.keys})

		handler.room_emit(socket, 'announce_role_change',
		{
			username1: socket.hue_username,
			username2: data.username,
			role: data.role
		})
	}

	handler.public.reset_voices = async function(socket, data)
	{
		if(!handler.is_admin_or_op(socket))
		{
			return handler.get_out(socket)
		}

		var info = await db_manager.get_room({_id:socket.hue_room_id}, {keys:true})

		var removed = false

		for(var key in info.keys)
		{
			if(info.keys[key].startsWith("voice") && info.keys[key] !== "voice1")
			{
				delete info.keys[key]
				removed = true
			}
		}

		if(!removed)
		{
			handler.user_emit(socket, 'novoicestoreset', {})
			return false
		}

		var sockets = handler.get_room_sockets(socket.hue_room_id)

		for(var socc of sockets)
		{
			if(socc.hue_role.startsWith("voice") && socc.hue_role !== "voice1")
			{
				socc.hue_role = 'voice1'

				handler.update_user_in_userlist(socc)
			}
		}

		db_manager.update_room(info._id, {keys:info.keys})

		handler.room_emit(socket, 'voices_resetted', {username:socket.hue_username})

		handler.push_admin_log_message(socket, "resetted the voices")
	}

	handler.public.remove_ops = async function(socket, data)
	{
		if(socket.hue_role !== 'admin')
		{
			return handler.get_out(socket)
		}

		var info = await db_manager.get_room({_id:socket.hue_room_id}, {keys:true})

		var removed = false

		for(var key in info.keys)
		{
			if(info.keys[key] === "op")
			{
				delete info.keys[key]
				removed = true
			}
		}

		if(!removed)
		{
			handler.user_emit(socket, 'noopstoremove', {})
			return false
		}

		var sockets = handler.get_room_sockets(socket.hue_room_id)

		for(var socc of sockets)
		{
			if(socc.hue_role === 'op')
			{
				socc.hue_role = ''

				handler.update_user_in_userlist(socc)
			}
		}

		handler.room_emit(socket, 'announce_removedops', {username:socket.hue_username})

		db_manager.update_room(info._id, {keys:info.keys})

		handler.push_admin_log_message(socket, "removed the ops")
	}

	handler.public.kick = function(socket, data)
	{
		if(!handler.is_admin_or_op(socket))
		{
			return handler.get_out(socket)
		}

		if(data.username === undefined)
		{
			return handler.get_out(socket)
		}

		if(data.username.length === 0)
		{
			return handler.get_out(socket)
		}

		if(data.username.length > config.max_max_username_length)
		{
			return handler.get_out(socket)
		}

		var sockets = handler.get_user_sockets_per_room_by_username(socket.hue_room_id, data.username)

		if(sockets.length > 0)
		{
			if(((sockets[0].role === 'admin' || sockets[0].role === 'op') && socket.hue_role !== 'admin') || sockets[0].superuser)
			{
				handler.user_emit(socket, 'forbiddenuser', {})
				return false
			}

			for(var socc of sockets)
			{
				socc.hue_role = ''
				socc.hue_kicked = true
				socc.hue_info1 = socket.hue_username

				handler.get_out(socc)
			}

			handler.push_admin_log_message(socket, `kicked "${data.username}"`)
		}

		else
		{
			handler.user_emit(socket, 'user_not_in_room', {})
			return false
		}
	}

	handler.public.ban = async function(socket, data)
	{
		if(!handler.is_admin_or_op(socket))
		{
			return handler.get_out(socket)
		}

		if(data.username === undefined)
		{
			return handler.get_out(socket)
		}

		if(data.username.length === 0)
		{
			return handler.get_out(socket)
		}

		if(data.username.length > config.max_max_username_length)
		{
			return handler.get_out(socket)
		}

		var info = await db_manager.get_room({_id:socket.hue_room_id}, {bans:true, keys:true})

		var userinfo = await db_manager.get_user({username:data.username}, {username:true})

		if(!userinfo)
		{
			handler.user_emit(socket, 'user_not_found', {})
			return false
		}

		var id = userinfo._id.toString()

		var current_role = info.keys[id]

		if((current_role === 'admin' || current_role === 'op') && socket.hue_role !== 'admin')
		{
			handler.user_emit(socket, 'forbiddenuser', {})
			return false
		}

		if(info.bans.includes(id))
		{
			handler.user_emit(socket, 'user_already_banned', {})
			return false
		}

		var sockets = handler.get_user_sockets_per_room(socket.hue_room_id, id)

		if(sockets.length > 0)
		{
			for(var socc of sockets)
			{
				if(socc.hue_superuser)
				{
					handler.user_emit(socket, 'forbiddenuser', {})
					return false
				}

				socc.hue_role = ''
				socc.hue_banned = true
				socc.hue_info1 = socket.hue_username
				handler.get_out(socc)
			}

			handler.push_admin_log_message(socket, `banned "${data.username}"`)
		}

		else
		{
			handler.room_emit(socket, 'announce_ban',
			{
				username1: socket.hue_username,
				username2: data.username
			})
		}

		info.bans.push(id)

		delete info.keys[id]

		db_manager.update_room(info._id, {bans:info.bans, keys:info.keys})
	}

	handler.public.unban = async function(socket, data)
	{
		if(!handler.is_admin_or_op(socket))
		{
			return handler.get_out(socket)
		}

		if(data.username === undefined)
		{
			return handler.get_out(socket)
		}

		if(data.username.length === 0)
		{
			return handler.get_out(socket)
		}

		if(data.username.length > config.max_max_username_length)
		{
			return handler.get_out(socket)
		}

		var info = await db_manager.get_room({_id:socket.hue_room_id}, {bans:true, keys:true})

		var userinfo = await db_manager.get_user({username:data.username}, {username:true})

		if(!userinfo)
		{
			handler.user_emit(socket, 'user_not_found', {})
			return false
		}

		var id = userinfo._id.toString()

		if(!info.bans.includes(id))
		{
			handler.user_emit(socket, 'user_already_unbanned', {})

			return false
		}

		for(var i=0; i<info.bans.length; i++)
		{
			if(info.bans[i] === id)
			{
				info.bans.splice(i, 1)
				break
			}
		}

		db_manager.update_room(info._id, {bans:info.bans})

		handler.room_emit(socket, 'announce_unban',
		{
			username1: socket.hue_username,
			username2: data.username
		})

		handler.push_admin_log_message(socket, `unbanned "${data.username}"`)
	}

	handler.public.unban_all = async function(socket, data)
	{
		if(!handler.is_admin_or_op(socket))
		{
			return handler.get_out(socket)
		}

		var info = await db_manager.get_room({_id:socket.hue_room_id}, {bans:true})

		if(info.bans.length > 0)
		{
			info.bans = []

			db_manager.update_room(info._id, {bans:info.bans})

			handler.room_emit(socket, 'announce_unban_all', {username:socket.hue_username})
			
			handler.push_admin_log_message(socket, "unbanned all banned users")
		}

		else
		{
			handler.user_emit(socket, 'nothingtounban', {})
		}
	}

	handler.public.get_banned_count = async function(socket, data)
	{
		if(!handler.is_admin_or_op(socket))
		{
			return handler.get_out(socket)
		}

		var info = await db_manager.get_room({_id:socket.hue_room_id}, {bans:true})

		if(info.bans === '')
		{
			var count = 0
		}

		else
		{
			var count = info.bans.length
		}

		handler.user_emit(socket, 'receive_banned_count', {count:count})
	}

	handler.public.change_log = async function(socket, data)
	{
		if(!handler.is_admin_or_op(socket))
		{
			return handler.get_out(socket)
		}

		if(data.log !== true && data.log !== false)
		{
			return handler.get_out(socket)
		}

		var info = await db_manager.get_room({_id:socket.hue_room_id}, {log:true})

		if(info.log !== data.log)
		{
			if(!data.log)
			{
				rooms[socket.hue_room_id].log_messages = []

				db_manager.update_room(socket.hue_room_id, {log:data.log, log_messages:[]})
			}

			else
			{
				db_manager.update_room(socket.hue_room_id, {log:data.log})
			}

			rooms[socket.hue_room_id].log = data.log

			handler.room_emit(socket, 'log_changed', {username:socket.hue_username, log:data.log})

			if(data.log)
			{
				var als = "enabled the log"
			}

			else
			{
				var als = "disabled the log"
			}

			handler.push_admin_log_message(socket, als)
		}
	}

	handler.public.clear_log = async function(socket, data)
	{
		if(!handler.is_admin_or_op(socket))
		{
			return handler.get_out(socket)
		}

		if(data.clear_room === undefined)
		{
			return handler.get_out(socket)
		}

		if(data.clear_room !== true && data.clear_room !== false)
		{
			return handler.get_out(socket)
		}

		var info = await db_manager.get_room({_id:socket.hue_room_id}, {log_messages:true})

		if(info.log_messages.length > 0 || rooms[socket.hue_room_id].log_messages.length > 0)
		{
			rooms[socket.hue_room_id].log_messages = []
			db_manager.update_room(socket.hue_room_id, {log_messages:[]})
			handler.room_emit(socket, 'log_cleared', {username:socket.hue_username, clear_room:data.clear_room})
			handler.push_admin_log_message(socket, "cleared the log")
		}

		else
		{
			if(data.clear_room)
			{
				handler.room_emit(socket, 'log_cleared', {username:socket.hue_username, clear_room:data.clear_room})
			}

			else
			{
				handler.user_emit(socket, 'nothingtoclear', {})
			}
		}
	}

	handler.public.change_privacy = function(socket, data)
	{
		if(!handler.is_admin_or_op(socket))
		{
			return handler.get_out(socket)
		}

		if(data.what !== true && data.what !== false)
		{
			return handler.get_out(socket)
		}

		db_manager.update_room(socket.hue_room_id, {public:data.what})

		handler.room_emit(socket, 'privacy_change', {username:socket.hue_username, what:data.what})

		if(data.what)
		{
			var als = "made the room public"
		}

		else
		{
			var als = "made the room private"
		}

		rooms[socket.hue_room_id].public = data.what

		handler.push_admin_log_message(socket, als)
	}

	handler.public.change_radio_source = async function(socket, data)
	{
		if(data.src === undefined)
		{
			return handler.get_out(socket)
		}

		if(data.src.length === 0)
		{
			return handler.get_out(socket)
		}

		if(data.src.length > config.max_radio_source_length)
		{
			return handler.get_out(socket)
		}

		if(data.src !== utilz.clean_string2(data.src))
		{
			return handler.get_out(socket)
		}

		if(!handler.check_permission(socket, "radio"))
		{
			return false
		}

		data.src = data.src.replace(/youtu\.be\/(\w{11})/, "www.youtube.com/watch?v=$1")

		if(data.src === "default")
		{
			handler.do_change_radio_source(socket, data)
			return
		}

		if(data.src.startsWith("http://") || data.src.startsWith("https://"))
		{
			if(data.src.includes("youtube.com") || data.src.includes("youtu.be"))
			{
				if(!config.youtube_enabled)
				{
					return false
				}

				var id = utilz.get_youtube_id(data.src)

				if(id)
				{
					if(id[0] === "video")
					{
						var st = "videos"
						var pid = id[1]
					}

					else if(id[0] === "list")
					{
						var st = "playlists"
						var pid = id[1][0]
					}

					else
					{
						handler.user_emit(socket, 'songnotfound', {})
						return false
					}

					fetch(`https://www.googleapis.com/youtube/v3/${st}?id=${pid}&fields=items(snippet(title))&part=snippet&key=${sconfig.youtube_api_key}`)

					.then(function(res)
					{
						return res.json()
					})

					.then(function(response)
					{
						if(response.items !== undefined && response.items.length > 0)
						{
							data.type = "youtube"
							data.title = response.items[0].snippet.title
							handler.do_change_radio_source(socket, data)
						}

						else
						{
							handler.user_emit(socket, 'songnotfound', {})
						}
					})

					.catch(err =>
					{
						logger.log_error(err)
					})
				}

				else
				{
					handler.user_emit(socket, 'songnotfound', {})
					return false
				}
			}

			else if(data.src.includes("soundcloud.com"))
			{
				data.src = data.src.split("#t=")[0]

				if(!config.soundcloud_enabled)
				{
					return
				}

				soundcloud.get(`/resolve?url=${encodeURIComponent(data.src)}`, function(err, track)
				{
					if(err)
					{
						handler.user_emit(socket, 'songnotfound', {})
						logger.log_error(err)
						return false
					}

					else
					{
						data.type = "soundcloud"

						data.title = track.title ? track.title : track.username

						if(!data.title)
						{
							data.title = data.src
						}

						handler.do_change_radio_source(socket, data)
					}
				})
			}

			else
			{
				var extension = utilz.get_extension(data.src).toLowerCase()

				if(extension)
				{
					if(!utilz.audio_extensions.includes(extension))
					{
						return false
					}
				}

				data.type = "radio"
				data.title = ""
				handler.do_change_radio_source(socket, data)
			}
		}

		else if(data.src === "restart" || data.src === "reset")
		{
			handler.room_emit(socket, 'restarted_radio_source',
			{
				username: socket.hue_username
			})
		}

		else
		{
			if(!config.youtube_enabled)
			{
				return
			}

			fetch(`https://www.googleapis.com/youtube/v3/search?q=${encodeURIComponent(data.src)}&type=video&fields=items(id,snippet(title))&part=snippet&maxResults=10&videoEmbeddable=true&key=${sconfig.youtube_api_key}`).then(function(res)
			{
				return res.json()
			})

			.then(function(response)
			{
				if(response.items !== undefined && response.items.length > 0)
				{
					for(var item of response.items)
					{
						if(item === undefined || item.id === undefined || item.id.videoId === undefined)
						{
							continue
						}

						data.type = "youtube"
						data.query = data.src
						data.src = `https://www.youtube.com/watch?v=${item.id.videoId}`
						data.title = response.items[0].snippet.title
						handler.do_change_radio_source(socket, data)
						return
					}

					handler.user_emit(socket, 'songnotfound', {})
					return false
				}

				else
				{
					handler.user_emit(socket, 'songnotfound', {})
				}
			})

			.catch(err =>
			{
				logger.log_error(err)
			})
		}
	}

	handler.do_change_radio_source = function(socket, data)
	{
		var radioinfo = {}

		var date = Date.now()

		if(data.query === undefined)
		{
			data.query = ""
		}

		if(rooms[socket.hue_room_id].current_radio_source === data.src)
		{
			handler.user_emit(socket, 'same_radio', {})
			return false
		}

		if(data.src === 'default')
		{
			radioinfo.radio_type = "radio"
			radioinfo.radio_source = ''
			radioinfo.radio_title = ''
			radioinfo.radio_query = ''
		}

		else
		{
			radioinfo.radio_type = data.type
			radioinfo.radio_source = data.src
			radioinfo.radio_title = data.title
			radioinfo.radio_query = data.query
		}

		radioinfo.radio_setter = socket.hue_username
		radioinfo.radio_date = date

		handler.room_emit(socket, 'changed_radio_source',
		{
			radio_type: radioinfo.radio_type,
			radio_source: radioinfo.radio_source,
			radio_title: radioinfo.radio_title,
			radio_setter: radioinfo.radio_setter,
			radio_date: radioinfo.radio_date,
			radio_query: radioinfo.radio_query
		})

		db_manager.update_room(socket.hue_room_id,
		{
			radio_type: radioinfo.radio_type,
			radio_source: radioinfo.radio_source,
			radio_title: radioinfo.radio_title,
			radio_setter: radioinfo.radio_setter,
			radio_date: radioinfo.radio_date,
			radio_query: radioinfo.radio_query
		})

		rooms[socket.hue_room_id].activity = true

		rooms[socket.hue_room_id].modified = Date.now()

		if(rooms[socket.hue_room_id].log)
		{
			var message =
			{
				type: "radio",
				data:
				{
					radio_type: radioinfo.radio_type,
					radio_source: radioinfo.radio_source,
					radio_title: radioinfo.radio_title,
					radio_setter: radioinfo.radio_setter,
					radio_query: radioinfo.radio_query
				},
				date: date
			}

			rooms[socket.hue_room_id].log_messages.push(message)
		}

		rooms[socket.hue_room_id].current_radio_source = radioinfo.radio_source
	}

	handler.public.change_tv_source = async function(socket, data)
	{
		if(data.src === undefined)
		{
			return handler.get_out(socket)
		}

		if(data.src.length === 0)
		{
			return handler.get_out(socket)
		}

		if(data.src.length > config.max_tv_source_length)
		{
			return handler.get_out(socket)
		}

		if(data.src !== utilz.clean_string2(data.src))
		{
			return handler.get_out(socket)
		}

		if(!handler.check_permission(socket, "tv"))
		{
			return false
		}

		data.src = data.src.replace(/youtu\.be\/(\w{11})/, "www.youtube.com/watch?v=$1")

		if(data.src === "default")
		{
			handler.do_change_tv_source(socket, data)
			return
		}

		if(data.src.startsWith("http://") || data.src.startsWith("https://"))
		{
			if(data.src.includes("youtube.com") || data.src.includes("youtu.be"))
			{
				if(!config.youtube_enabled)
				{
					return
				}

				var id = utilz.get_youtube_id(data.src)

				if(id)
				{
					if(id[0] === "video")
					{
						var st = "videos"
						var pid = id[1]
					}

					else if(id[0] === "list")
					{
						var st = "playlists"
						var pid = id[1][0]
					}

					else
					{
						handler.user_emit(socket, 'videonotfound', {})
						return false
					}

					fetch(`https://www.googleapis.com/youtube/v3/${st}?id=${pid}&fields=items(snippet(title))&part=snippet&key=${sconfig.youtube_api_key}`)

					.then(function(res)
					{
						return res.json()
					})

					.then(function(response)
					{
						if(response.items !== undefined && response.items.length > 0)
						{
							data.type = "youtube"
							data.title = response.items[0].snippet.title
							handler.do_change_tv_source(socket, data)
						}

						else
						{
							handler.user_emit(socket, 'videonotfound', {})
							return false
						}
					})

					.catch(err =>
					{
						handler.user_emit(socket, 'videonotfound', {})
						logger.log_error(err)
					})
				}

				else
				{
					handler.user_emit(socket, 'videonotfound', {})
				}
			}

			else if(data.src.includes("twitch.tv"))
			{
				if(!config.twitch_enabled)
				{
					return false
				}

				var id = utilz.get_twitch_id(data.src)

				if(id)
				{
					if(id[0] === "video")
					{
						fetch(`https://api.twitch.tv/helix/videos?id=${id[1]}`,
						{
							headers:
							{
								"Client-ID": sconfig.twitch_client_id
							}
						})

						.then(function(res)
						{
							return res.json()
						})

						.then(function(response)
						{
							data.type = "twitch"
							data.title = response.data[0].title
							handler.do_change_tv_source(socket, data)
						})

						.catch(err =>
						{
							handler.user_emit(socket, 'videonotfound', {})
							logger.log_error(err)
						})
					}

					else if(id[0] === "channel")
					{
						fetch(`https://api.twitch.tv/helix/streams?user_login=${id[1]}`,
						{
							headers:
							{
								"Client-ID": sconfig.twitch_client_id
							}
						})

						.then(function(res)
						{
							return res.json()
						})

						.then(function(response)
						{
							data.type = "twitch"

							if(response.data && response.data[0].title)
							{
								data.title = response.data[0].title
							}

							else
							{
								data.title = id[1]
							}

							handler.do_change_tv_source(socket, data)
						})

						.catch(err =>
						{
							data.type = "twitch"
							data.title = id[1]
							handler.do_change_tv_source(socket, data)
						})
					}

					else
					{
						handler.user_emit(socket, 'videonotfound', {})
						return false
					}
				}

				else
				{
					handler.user_emit(socket, 'videonotfound', {})
				}
			}

			else if(data.src.includes("soundcloud.com"))
			{
				data.src = data.src.split("#t=")[0]

				if(!config.soundcloud_enabled)
				{
					return false
				}

				soundcloud.get(`/resolve?url=${encodeURIComponent(data.src)}`, function(err, track)
				{
					if(err)
					{
						handler.user_emit(socket, 'videonotfound', {})
						logger.log_error(err)
						return false
					}

					else
					{
						data.type = "soundcloud"

						data.title = track.title ? track.title : track.username

						if(!data.title)
						{
							data.title = data.src
						}

						handler.do_change_tv_source(socket, data)
					}
				})
			}

			else
			{
				var extension = utilz.get_extension(data.src).toLowerCase()
				
				if(extension)
				{
					if(utilz.video_extensions.includes(extension) || utilz.audio_extensions.includes(extension))
					{
						data.type = "url"
					}

					else
					{
						data.type = "iframe"
					}
				}

				else
				{
					data.type = "iframe"
				}

				data.title = ""

				if(data.type === "iframe")
				{
					if(config.https_enabled && data.src.includes("http://"))
					{
						handler.user_emit(socket, 'cannot_embed_iframe', {})
						return false
					}

					if((data.src + "/").includes(config.site_root))
					{
						handler.user_emit(socket, 'cannot_embed_iframe', {})
						return false
					}

					fetch(data.src)
					
					.then(res => 
					{
						var xframe_options = res.headers.get('x-frame-options') || ""

						xframe_options = xframe_options.toLowerCase()

						if(xframe_options === "deny" || xframe_options === "sameorigin")
						{
							handler.user_emit(socket, 'cannot_embed_iframe', {})
							return false
						}

						else
						{
							handler.do_change_tv_source(socket, data)
						}
					})

					.catch(err =>
					{
						handler.user_emit(socket, 'cannot_embed_iframe', {})
					})
				}

				else
				{
					handler.do_change_tv_source(socket, data)
				}
			}
		}

		else if(data.src === "restart" || data.src === "reset")
		{
			handler.room_emit(socket, 'restarted_tv_source',
			{
				username: socket.hue_username
			})
		}

		else
		{
			if(!config.youtube_enabled)
			{
				return false
			}

			fetch(`https://www.googleapis.com/youtube/v3/search?q=${encodeURIComponent(data.src)}&type=video&fields=items(id,snippet(title))&part=snippet&maxResults=10&videoEmbeddable=true&key=${sconfig.youtube_api_key}`)

			.then(function(res)
			{
				return res.json()
			})

			.then(function(response)
			{
				if(response.items !== undefined && response.items.length > 0)
				{
					for(var item of response.items)
					{
						if(item === undefined || item.id === undefined || item.id.videoId === undefined)
						{
							continue
						}

						data.type = "youtube"
						data.query = data.src
						data.src = `https://www.youtube.com/watch?v=${item.id.videoId}`
						data.title = response.items[0].snippet.title
						handler.do_change_tv_source(socket, data)
						return
					}

					handler.user_emit(socket, 'videonotfound', {})
					return false
				}

				else
				{
					handler.user_emit(socket, 'videonotfound', {})
				}
			})

			.catch(err =>
			{
				logger.log_error(err)
			})
		}
	}

	handler.do_change_tv_source = function(socket, data)
	{
		var tvinfo = {}

		var date = Date.now()

		if(data.query === undefined)
		{
			data.query = ""
		}

		if(rooms[socket.hue_room_id].current_tv_source === data.src)
		{
			handler.user_emit(socket, 'same_tv', {})
			return false
		}

		if(data.src === 'default')
		{
			tvinfo.tv_type = "tv"
			tvinfo.tv_source = ''
			tvinfo.tv_title = ''
			tvinfo.tv_query = ''
		}

		else
		{
			tvinfo.tv_type = data.type
			tvinfo.tv_source = data.src
			tvinfo.tv_title = data.title
			tvinfo.tv_query = data.query
		}

		tvinfo.tv_setter = socket.hue_username
		tvinfo.tv_date = date

		handler.room_emit(socket, 'changed_tv_source',
		{
			tv_type: tvinfo.tv_type,
			tv_source: tvinfo.tv_source,
			tv_title: tvinfo.tv_title,
			tv_setter: tvinfo.tv_setter,
			tv_date: tvinfo.tv_date,
			tv_query: tvinfo.tv_query
		})

		db_manager.update_room(socket.hue_room_id,
		{
			tv_type: tvinfo.tv_type,
			tv_source: tvinfo.tv_source,
			tv_title: tvinfo.tv_title,
			tv_setter: tvinfo.tv_setter,
			tv_date: tvinfo.tv_date,
			tv_query: tvinfo.tv_query
		})

		rooms[socket.hue_room_id].activity = true

		rooms[socket.hue_room_id].modified = Date.now()

		if(rooms[socket.hue_room_id].log)
		{
			var message =
			{
				type: "tv",
				data:
				{
					tv_type: tvinfo.tv_type,
					tv_source: tvinfo.tv_source,
					tv_title: tvinfo.tv_title,
					tv_setter: tvinfo.tv_setter,
					tv_query: tvinfo.tv_query
				},
				date: date
			}

			rooms[socket.hue_room_id].log_messages.push(message)
		}

		rooms[socket.hue_room_id].current_tv_source = tvinfo.tv_source
	}

	handler.public.change_username = async function(socket, data)
	{
		if(data.username === undefined)
		{
			return handler.get_out(socket)
		}

		if(data.username.length === 0)
		{
			return handler.get_out(socket)
		}

		if(data.username.length > config.max_username_length)
		{
			return handler.get_out(socket)
		}

		if(utilz.clean_string4(data.username) !== data.username)
		{
			return handler.get_out(socket)
		}

		var old_username = socket.hue_username

		var done = await db_manager.change_username(socket.hue_user_id, data.username)

		if(done)
		{
			for(var room_id of user_rooms[socket.hue_user_id])
			{
				for(var socc of handler.get_user_sockets_per_room(room_id, socket.hue_user_id))
				{
					socc.hue_username = data.username
				}

				handler.update_user_in_userlist(socket)

				handler.room_emit(room_id, 'new_username',
				{
					username: data.username,
					old_username: old_username
				})
			}
		}

		else
		{
			handler.user_emit(socket, 'username_already_exists', {username:data.username})
		}
	}

	handler.public.change_password = function(socket, data)
	{
		if(data.password === undefined)
		{
			return handler.get_out(socket)
		}

		if(data.password.length === 0 || data.password.length < config.min_password_length)
		{
			return handler.get_out(socket)
		}

		if(data.password.length > config.max_password_length)
		{
			return handler.get_out(socket)
		}

		db_manager.update_user(socket.hue_user_id,
		{
			password: data.password,
			password_date: Date.now()
		})

		handler.user_emit(socket, 'password_changed', {password:data.password})
	}

	handler.public.change_email = async function(socket, data)
	{
		if(data.email === undefined)
		{
			return handler.get_out(socket)
		}

		if(!data.email.includes('@') || data.email.includes(' '))
		{
			return handler.get_out(socket)
		}

		if(data.email.length > config.max_email_length)
		{
			return handler.get_out(socket)
		}

		if(utilz.clean_string5(data.email) !== data.email)
		{
			return handler.get_out(socket)
		}

		var ans = await db_manager.change_email(socket.hue_user_id, data.email)

		if(ans.message === "error")
		{
			handler.user_emit(socket, 'error_occurred', {})
			return
		}

		else if(ans.message === "duplicate")
		{
			handler.user_emit(socket, 'email_already_exists', {email:data.email})
			return
		}

		else if(ans.message === "wait")
		{
			handler.user_emit(socket, 'email_change_wait', {})
			return
		}

		else if(ans.message === "sent_code")
		{
			handler.user_emit(socket, 'email_change_code_sent', {email:data.email})
			return
		}
	}

	handler.public.verify_email = async function(socket, data)
	{
		if(utilz.clean_string5(data.code) !== data.code)
		{
			return handler.get_out(socket)
		}

		if(data.code.length === 0)
		{
			return handler.get_out(socket)
		}

		if(data.code.length > config.email_change_code_max_length)
		{
			return handler.get_out(socket)
		}

		var ans = await db_manager.change_email(socket.hue_user_id, data.email, data.code)

		if(ans.message === "error")
		{
			handler.user_emit(socket, 'error_occurred', {})
			return
		}

		else if(ans.message === "duplicate")
		{
			handler.user_emit(socket, 'email_already_exists', {email:data.email})
			return
		}

		else if(ans.message === "not_sent")
		{
			handler.user_emit(socket, 'email_change_code_not_sent', {email:data.email})
			return
		}

		else if(ans.message === "wrong_code")
		{
			handler.user_emit(socket, 'email_change_wrong_code', {email:data.email})
			return
		}

		else if(ans.message === "expired_code")
		{
			handler.user_emit(socket, 'email_change_expired_code', {email:data.email})
			return
		}

		else if(ans.message === "changed")
		{
			for(var room_id of user_rooms[socket.hue_user_id])
			{
				for(var socc of handler.get_user_sockets_per_room(room_id, socket.hue_user_id))
				{
					socc.hue_email = data.email
				}

				handler.update_user_in_userlist(socket)
			}

			handler.user_emit(socket, 'email_changed', {email:ans.email})
		}
	}

	handler.public.change_images_mode = function(socket, data)
	{
		if(!handler.is_admin_or_op(socket))
		{
			return handler.get_out(socket)
		}

		if(data.what !== "enabled" && data.what !== "disabled" && data.what !== "locked")
		{
			return handler.get_out(socket)
		}

		rooms[socket.hue_room_id].images_mode = data.what

		db_manager.update_room(socket.hue_room_id,
		{
			images_mode: data.what
		})

		handler.room_emit(socket, 'room_images_mode_change',
		{
			what: data.what,
			username: socket.hue_username
		})

		handler.push_admin_log_message(socket, `changed the image mode to "${data.what}"`)
	}

	handler.public.change_tv_mode = function(socket, data)
	{
		if(!handler.is_admin_or_op(socket))
		{
			return handler.get_out(socket)
		}

		if(data.what !== "enabled" && data.what !== "disabled" && data.what !== "locked")
		{
			return handler.get_out(socket)
		}

		rooms[socket.hue_room_id].tv_mode = data.what

		db_manager.update_room(socket.hue_room_id,
		{
			tv_mode: data.what
		})

		handler.room_emit(socket, 'room_tv_mode_change',
		{
			what: data.what,
			username: socket.hue_username
		})

		handler.push_admin_log_message(socket, `changed the tv mode to "${data.what}"`)
	}

	handler.public.change_radio_mode = function(socket, data)
	{
		if(!handler.is_admin_or_op(socket))
		{
			return handler.get_out(socket)
		}

		if(data.what !== "enabled" && data.what !== "disabled" && data.what !== "locked")
		{
			return handler.get_out(socket)
		}

		rooms[socket.hue_room_id].radio_mode = data.what

		db_manager.update_room(socket.hue_room_id,
		{
			radio_mode: data.what
		})

		handler.room_emit(socket, 'room_radio_mode_change',
		{
			what: data.what,
			username: socket.hue_username
		})

		handler.push_admin_log_message(socket, `changed the radio mode to "${data.what}"`)
	}

	handler.public.change_voice_chat_mode = function(socket, data)
	{
		if(!handler.is_admin_or_op(socket))
		{
			return handler.get_out(socket)
		}

		if(data.what !== "enabled" && data.what !== "disabled")
		{
			return handler.get_out(socket)
		}

		rooms[socket.hue_room_id].voice_chat_sockets = []

		rooms[socket.hue_room_id].voice_chat_mode = data.what

		db_manager.update_room(socket.hue_room_id,
		{
			voice_chat_mode: data.what
		})

		handler.room_emit(socket, 'room_voice_chat_mode_change',
		{
			what: data.what,
			username: socket.hue_username
		})

		handler.push_admin_log_message(socket, `changed the voice chat mode to "${data.what}"`)
	}

	handler.public.change_theme = function(socket, data)
	{
		if(!handler.is_admin_or_op(socket))
		{
			return handler.get_out(socket)
		}

		if(data.color === undefined)
		{
			return handler.get_out(socket)
		}

		if(data.color !== utilz.clean_string5(data.color))
		{
			return handler.get_out(socket)
		}

		if(!utilz.validate_rgb(data.color))
		{
			return handler.get_out(socket)
		}

		db_manager.update_room(socket.hue_room_id,
		{
			theme: data.color
		})

		handler.room_emit(socket, 'theme_change',
		{
			color: data.color,
			username: socket.hue_username
		})

		handler.push_admin_log_message(socket, `changed the theme to "${data.color}"`)
	}

	handler.public.change_background_mode = function(socket, data)
	{
		if(!handler.is_admin_or_op(socket))
		{
			return handler.get_out(socket)
		}

		if(data.mode !== "normal" && data.mode !== "tiled" && data.mode !== "mirror" && data.mode !== "solid")
		{
			return handler.get_out(socket)
		}

		db_manager.update_room(socket.hue_room_id,
		{
			background_mode: data.mode
		})

		handler.room_emit(socket, 'background_mode_changed',
		{
			mode: data.mode,
			username: socket.hue_username
		})

		handler.push_admin_log_message(socket, `changed the background mode to "${data.mode}"`)
	}

	handler.public.change_background_tile_dimensions = function(socket, data)
	{
		if(!handler.is_admin_or_op(socket))
		{
			return handler.get_out(socket)
		}

		if(data.dimensions.length > config.safe_limit_1)
		{
			return handler.get_out(socket)
		}

		if(data.dimensions !== utilz.clean_string2(data.dimensions))
		{
			return handler.get_out(socket)
		}

		db_manager.update_room(socket.hue_room_id,
		{
			background_tile_dimensions: data.dimensions
		})

		handler.room_emit(socket, 'background_tile_dimensions_changed',
		{
			dimensions: data.dimensions,
			username: socket.hue_username
		})

		handler.push_admin_log_message(socket, `changed the background tile dimensions to "${data.dimensions}"`)
	}

	handler.public.change_text_color_mode = function(socket, data)
	{
		if(!handler.is_admin_or_op(socket))
		{
			return handler.get_out(socket)
		}

		if(data.mode !== "automatic" && data.mode !== "custom")
		{
			return handler.get_out(socket)
		}

		db_manager.update_room(socket.hue_room_id,
		{
			text_color_mode: data.mode
		})

		handler.room_emit(socket, 'text_color_mode_changed',
		{
			mode: data.mode,
			username: socket.hue_username
		})

		handler.push_admin_log_message(socket, `changed the text color mode to "${data.mode}"`)
	}

	handler.public.change_text_color = function(socket, data)
	{
		if(!handler.is_admin_or_op(socket))
		{
			return handler.get_out(socket)
		}

		if(data.color === undefined)
		{
			return handler.get_out(socket)
		}

		if(data.color !== utilz.clean_string5(data.color))
		{
			return handler.get_out(socket)
		}

		if(!utilz.validate_rgb(data.color))
		{
			return handler.get_out(socket)
		}

		db_manager.update_room(socket.hue_room_id,
		{
			text_color: data.color
		})

		handler.room_emit(socket, 'text_color_changed',
		{
			color: data.color,
			username: socket.hue_username
		})

		handler.push_admin_log_message(socket, `changed the text color to "${data.color}"`)
	}

	handler.public.change_voice_permission = function(socket, data)
	{
		if(!handler.is_admin_or_op(socket))
		{
			return handler.get_out(socket)
		}

		if(data.what !== true && data.what !== false)
		{
			return handler.get_out(socket)
		}

		if(data.ptype === undefined)
		{
			return handler.get_out(socket)
		}

		if(rooms[socket.hue_room_id][data.ptype] === undefined)
		{
			return handler.get_out(socket)
		}

		rooms[socket.hue_room_id][data.ptype] = data.what

		var obj = {}

		obj[data.ptype] = data.what

		db_manager.update_room(socket.hue_room_id, obj)

		handler.room_emit(socket, 'voice_permission_change',
		{
			ptype: data.ptype,
			what: data.what,
			username: socket.hue_username
		})

		handler.push_admin_log_message(socket, `changed ${data.ptype} to "${data.what}"`)
	}

	handler.do_disconnect = function(socc)
	{
		socc.disconnect()
		return false
	}

	handler.disconnect = function(socket)
	{
		if(socket.hue_user_id === undefined)
		{
			return
		}

		if(socket.hue_room_id !== undefined)
		{
			if(rooms[socket.hue_room_id] !== undefined)
			{
				var voice_chat_sockets = rooms[socket.hue_room_id].voice_chat_sockets

				for(var socc of voice_chat_sockets)
				{
					if(socc.hue_user_id === socket.hue_user_id)
					{
						handler.voice_chat_disconnect_socket(socket)
						break
					}
				}
			}
		}

		if(handler.user_already_connected(socket))
		{
			return
		}

		if(socket.hue_room_id !== undefined)
		{
			if(rooms[socket.hue_room_id] === undefined)
			{
				return
			}

			delete rooms[socket.hue_room_id].userlist[socket.hue_user_id]

			if(user_rooms[socket.hue_user_id] !== undefined)
			{
				for(var i=0; i<user_rooms[socket.hue_user_id].length; i++)
				{
					var room_id = user_rooms[socket.hue_user_id][i]

					if(socket.hue_room_id === room_id)
					{
						user_rooms[socket.hue_user_id].splice(i, 1)
						break
					}
				}

				if(user_rooms[socket.hue_user_id].length === 0)
				{
					delete user_rooms[socket.hue_user_id]
				}
			}
		}

		if(socket.hue_joined)
		{
			if(socket.hue_pinged)
			{
				var type = 'pinged'
			}

			else if(socket.hue_kicked)
			{
				var type = 'kicked'
			}

			else if(socket.hue_banned)
			{
				var type = 'banned'
			}

			else
			{
				var type = 'disconnection'
			}

			handler.room_emit(socket, "userdisconnect",
			{
				username: socket.hue_username,
				info1: socket.hue_info1,
				role: socket.hue_role,
				disconnection_type: type
			})
		}
	}

	handler.compare_roomlist = function(a, b)
	{
		if(a.usercount < b.usercount)
		{
			return 1
		}

		if(a.usercount > b.usercount)
		{
			return -1
		}

		if(a.usercount === b.usercount)
		{
			if(a.modified < b.modified)
			{
				return 1
			}

			if(a.modified > b.modified)
			{
				return -1
			}

			return 0
		}
	}

	handler.get_userlist = function(room_id)
	{
		try
		{
			if(rooms[room_id] === undefined)
			{
				return {}
			}

			if(rooms[room_id].userlist !== undefined)
			{
				return rooms[room_id].userlist
			}

			else
			{
				return {}
			}
		}

		catch(err)
		{
			return {}
		}
	}

	handler.get_usercount = function(room_id)
	{
		return Object.keys(handler.get_userlist(room_id)).length
	}

	handler.get_roomlist = async function(callback)
	{
		if(last_roomlist === undefined || (Date.now() - roomlist_lastget > config.roomlist_cache))
		{
			var roomlist = []

			var md = Date.now() - config.roomlist_max_inactivity

			for(var room_id in rooms)
			{
				var room = rooms[room_id]

				if(room.public && room.modified > md)
				{
					roomlist.push({id:room._id, name:room.name, topic:room.topic.substring(0, config.max_roomlist_topic_length), usercount:handler.get_usercount(room._id), modified:room.modified})
				}
			}

			roomlist.sort(handler.compare_roomlist).splice(config.max_roomlist_items)

			last_roomlist = roomlist

			roomlist_lastget = Date.now()

			callback(last_roomlist)
		}

		else
		{
			callback(last_roomlist)
		}
	}

	handler.get_visited_roomlist = async function(user_id, callback)
	{
		var roomlist = []

		var userinfo = await db_manager.get_user({_id:user_id}, {visited_rooms:true})

		var mids = []

		for(var id of userinfo.visited_rooms)
		{
			if(typeof id === "string" && id !== config.main_room_id)
			{
				mids.push(new mongo.ObjectId(id))
			}

			else
			{
				mids.push(id)
			}
		}

		var results = await db_manager.find_rooms({_id:{"$in":mids}})

		if(!results)
		{
			return false
		}

		for(var i=0; i<results.length; i++)
		{
			var room = results[i]

			roomlist.push({id:room._id.toString(), name:room.name, topic:room.topic.substring(0, config.max_roomlist_topic_length), usercount:handler.get_usercount(room._id.toString()), modified:room.modified})
		}

		roomlist.sort(handler.compare_roomlist)

		callback(roomlist)
	}

	handler.public.change_image_source = function(socket, data)
	{
		if(data.src === undefined)
		{
			return handler.get_out(socket)
		}

		if(data.src.length === 0)
		{
			return handler.get_out(socket)
		}

		if(data.src.length > config.max_image_source_length)
		{
			return handler.get_out(socket)
		}

		if(data.src !== utilz.clean_string2(data.src))
		{
			return handler.get_out(socket)
		}

		if(!handler.check_permission(socket, "images"))
		{
			return false
		}

		if(data.src === "default")
		{
			var obj = {}

			obj.fname = "default"
			obj.setter = socket.hue_username
			obj.size = 0
			obj.type = "link"

			handler.change_image(socket, obj)

			return
		}

		else
		{
			data.src = data.src.replace(/\.gifv/g,'.gif')
		}

		if(!data.src.startsWith("http://") && !data.src.startsWith("https://") && !data.src.startsWith("/"))
		{
			if(!config.imgur_enabled)
			{
				return false
			}

			fetch(`https://api.imgur.com/3/gallery/search/?q=${encodeURIComponent(data.src)}`,
			{
				headers: 
				{
					Authorization: `Client-ID ${sconfig.imgur_client_id}`
				}
			})

			.then(function(res)
			{
				return res.json()
			})

			.then(function(response)
			{
				if(!response.data || !Array.isArray(response.data))
				{
					return false
				}

				for(var item of response.data)
				{
					if(item)
					{
						if(item.type)
						{
							if(item.type.startsWith("image"))
							{
								var obj = {}
								obj.query = data.src
								obj.fname = item.link
								obj.setter = socket.hue_username
								obj.size = 0
								obj.type = "link"

								handler.change_image(socket, obj)

								return
							}
						}

						else if(item.images)
						{
							for(var img of item.images)
							{
								if(img.type.startsWith("image"))
								{
									var obj = {}
									obj.query = data.src
									obj.fname = img.link
									obj.setter = socket.hue_username
									obj.size = 0
									obj.type = "link"

									handler.change_image(socket, obj)

									return
								}
							}
						}
					}
				}

				handler.user_emit(socket, 'imagenotfound', {})
			})

			.catch(err =>
			{
				logger.log_error(err)
			})		
		}

		else
		{
			var extension = utilz.get_extension(data.src).toLowerCase()

			if(!extension || !utilz.image_extensions.includes(extension))
			{
				return false
			}

			var obj = {}

			obj.fname = data.src
			obj.setter = socket.hue_username
			obj.size = 0
			obj.type = "link"

			handler.change_image(socket, obj)
		}
	}

	handler.upload_image = function(socket, data)
	{
		if(data.image_file === undefined)
		{
			return handler.get_out(socket)
		}

		if(data.extension === undefined)
		{
			return handler.get_out(socket)
		}

		if(!handler.check_permission(socket, "images"))
		{
			return false
		}

		var size = data.image_file.toString('ascii').length / 1024

		if(size === 0 || (size > config.max_image_size))
		{
			handler.user_emit(socket, 'upload_error', {})
			return false
		}

		var fname = `${socket.hue_room_id}_${Date.now()}_${utilz.get_random_int(0, 1000)}.${data.extension}`

		fs.writeFile(images_root + '/' + fname, data.image_file, function(err, data)
		{
			if(err)
			{
				handler.user_emit(socket, 'upload_error', {})
			}

			else
			{
				var obj = {}

				obj.fname = fname
				obj.setter = socket.hue_username
				obj.size = size
				obj.type = "upload"

				handler.change_image(socket, obj)
			}
		})
	}

	handler.change_image = function(socket, data)
	{
		if(data.type === "link")
		{
			handler.do_change_image(socket, data)
		}

		else if(data.type === "upload")
		{
			if(config.image_storage_s3_or_local === "local")
			{
				handler.do_change_image(socket, data)
			}

			else if(config.image_storage_s3_or_local === "s3")
			{
				fs.readFile(`${images_root}/${data.fname}`, (err, data) =>
				{
					if(err)
					{
						fs.unlink(`${images_root}/${data.fname}`, function(){})
						return
					}

					s3.putObject(
					{
						ACL: "public-read",
						ContentType: handler.get_content_type(data.fname),
						Body: data,
						Bucket: sconfig.s3_bucket_name,
						Key: `${sconfig.s3_images_location}${data.fname}`,
						CacheControl: `max-age=${sconfig.s3_cache_max_age}`
					}).promise()

					.then(ans =>
					{
						fs.unlink(`${images_root}/${data.fname}`, function(){})
						data.fname = sconfig.s3_main_url + sconfig.s3_images_location + data.fname
						handler.do_change_image(socket, data)
					})

					.catch(err =>
					{
						fs.unlink(`${images_root}/${data.fname}`, function(){})
						logger.log_error(err)
					})
				})
			}

			else
			{
				return false
			}
		}
	}

	handler.do_change_image = async function(socket, data)
	{
		var image_source

		var date = Date.now()

		if(data.query === undefined)
		{
			data.query = ""
		}

		if(data.type === "link")
		{
			image_source = data.fname

			if(image_source === 'default')
			{
				image_source = ""
			}

			if(rooms[socket.hue_room_id].current_image_source === data.fname)
			{
				handler.user_emit(socket, 'same_image', {})
				return false
			}

			db_manager.update_room(socket.hue_room_id,
			{
				image_source: image_source,
				image_setter: data.setter,
				image_size: data.size,
				image_date: date,
				image_type: data.type,
				image_query: data.query
			})
		}

		else if(data.type === "upload")
		{
			if(config.image_storage_s3_or_local === "local")
			{
				image_source = config.public_images_location + data.fname
			}

			else if(config.image_storage_s3_or_local === "s3")
			{
				image_source = data.fname
			}

			else
			{
				return false
			}

			var info = await db_manager.get_room({_id:socket.hue_room_id}, {stored_images:true})

			info.stored_images.unshift(data.fname)

			var spliced = false

			if(info.stored_images.length > config.max_stored_images)
			{
				var spliced = info.stored_images.splice(config.max_stored_images, info.stored_images.length)
			}

			db_manager.update_room(socket.hue_room_id,
			{
				image_source: image_source,
				image_setter: data.setter,
				image_size: data.size,
				image_date: date,
				stored_images: info.stored_images,
				image_type: data.type,
				image_query: data.query
			})

			if(spliced)
			{
				for(var file_name of spliced)
				{
					if(!file_name.includes(sconfig.s3_main_url))
					{
						fs.unlink(`${images_root}/${file_name}`, function(err){})
					}

					else
					{
						s3.deleteObject(
						{
							Bucket: sconfig.s3_bucket_name,
							Key: file_name.replace(sconfig.s3_main_url, "")
						}).promise()

						.catch(err =>
						{
							logger.log_error(err)
						})
					}
				}
			}
		}

		else
		{
			return false
		}

		if(image_source === undefined)
		{
			return false
		}

		handler.room_emit(socket.hue_room_id, 'changed_image_source',
		{
			image_source: image_source,
			image_setter: data.setter,
			image_size: data.size,
			image_date: date,
			image_type: data.type,
			image_query: data.query
		})

		rooms[socket.hue_room_id].activity = true

		rooms[socket.hue_room_id].modified = Date.now()

		if(rooms[socket.hue_room_id].log)
		{
			var message =
			{
				type: "image",
				data:
				{
					image_source: image_source,
					image_setter: data.setter,
					image_size: data.size,
					image_type: data.type,
					image_query: data.query
				},
				date: date
			}

			rooms[socket.hue_room_id].log_messages.push(message)
		}

		rooms[socket.hue_room_id].current_image_source = image_source
	}

	handler.upload_profile_image = function(socket, data)
	{
		if(data.image_file === undefined)
		{
			return handler.get_out(socket)
		}

		var dimensions = image_dimensions(data.image_file)

		if(dimensions.width !== config.profile_image_diameter || dimensions.height !== config.profile_image_diameter)
		{
			return handler.get_out(socket)
		}

		var size = data.image_file.toString('ascii').length / 1024

		if(size === 0 || (size > config.max_profile_image_size))
		{
			handler.user_emit(socket, 'upload_error', {})
			return false
		}

		var fname = `profile_${socket.hue_user_id}.jpg`

		fs.writeFile(images_root + '/' + fname, data.image_file, function(err, data)
		{
			if(err)
			{
				handler.user_emit(socket, 'upload_error', {})
			}

			else
			{
				handler.change_profile_image(socket, fname)
			}
		})
	}

	handler.change_profile_image = function(socket, fname)
	{
		if(config.image_storage_s3_or_local === "local")
		{
			handler.do_change_profile_image(socket, fname)
		}

		else if(config.image_storage_s3_or_local === "s3")
		{
			fs.readFile(`${images_root}/${fname}`, (err, data) =>
			{
				if(err)
				{
					fs.unlink(`${images_root}/${fname}`, function(){})
					return
				}

				s3.putObject(
				{
					ACL: "public-read",
					ContentType: handler.get_content_type(fname),
					Body: data,
					Bucket: sconfig.s3_bucket_name,
					Key: `${sconfig.s3_images_location}${fname}`,
					CacheControl: `max-age=${sconfig.s3_cache_max_age}`
				}).promise()

				.then(ans =>
				{
					fs.unlink(`${images_root}/${fname}`, function(){})
					handler.do_change_profile_image(socket, sconfig.s3_main_url + sconfig.s3_images_location + fname)
				})

				.catch(err =>
				{
					fs.unlink(`${images_root}/${fname}`, function(){})
					logger.log_error(err)
				})
			})
		}

		else
		{
			return false
		}
	}

	handler.do_change_profile_image = async function(socket, fname)
	{
		var userinfo = await db_manager.get_user({_id:socket.hue_user_id}, {profile_image_version:true})

		var new_ver = userinfo.profile_image_version + 1

		var fver = `${fname}?ver=${new_ver}`

		if(config.image_storage_s3_or_local === "local")
		{
			var image_url = config.public_images_location + fver
		}

		else if(config.image_storage_s3_or_local === "s3")
		{
			var image_url = fver
		}

		var ans = await db_manager.update_user(socket.hue_user_id,
		{
			profile_image: fver,
			profile_image_version: new_ver
		})

		for(var room_id of user_rooms[socket.hue_user_id])
		{
			for(var socc of handler.get_user_sockets_per_room(room_id, socket.hue_user_id))
			{
				socc.hue_profile_image = image_url
			}

			handler.update_user_in_userlist(socket)

			handler.room_emit(room_id, 'profile_image_changed',
			{
				username: socket.hue_username,
				profile_image: image_url
			})
		}
	}

	handler.upload_background_image = function(socket, data)
	{
		if(data.image_file === undefined)
		{
			return handler.get_out(socket)
		}

		if(data.extension === undefined)
		{
			return handler.get_out(socket)
		}

		var size = data.image_file.toString('ascii').length / 1024

		if(size === 0 || (size > config.max_image_size))
		{
			handler.user_emit(socket, 'upload_error', {})
			return false
		}

		var fname = `bg_${socket.hue_room_id}_${Date.now()}_${utilz.get_random_int(0, 1000)}.${data.extension}`

		fs.writeFile(images_root + '/' + fname, data.image_file, function(err, data)
		{
			if(err)
			{
				handler.user_emit(socket, 'upload_error', {})
			}

			else
			{
				handler.change_background_image(socket, fname)
			}
		})
	}

	handler.public.change_background_image_source = function(socket, data)
	{
		if(!handler.is_admin_or_op(socket))
		{
			return handler.get_out(socket)
		}

		if(data.src === undefined)
		{
			return handler.get_out(socket)
		}

		if(data.src.length === 0)
		{
			return handler.get_out(socket)
		}

		if(data.src.length > config.max_image_source_length)
		{
			return handler.get_out(socket)
		}

		if(data.src !== "default")
		{
			data.src = data.src.replace(/\s/g,'').replace(/\.gifv/g,'.gif')

			var extension = utilz.get_extension(data.src).toLowerCase()

			if(!extension || !utilz.image_extensions.includes(extension))
			{
				return false
			}
		}

		handler.do_change_background_image(socket, data.src, "external")
	}

	handler.change_background_image = function(socket, fname)
	{
		if(config.image_storage_s3_or_local === "local")
		{
			handler.do_change_background_image(socket, fname, "hosted")
		}

		else if(config.image_storage_s3_or_local === "s3")
		{
			fs.readFile(`${images_root}/${fname}`, (err, data) =>
			{
				if(err)
				{
					fs.unlink(`${images_root}/${fname}`, function(){})
					return
				}

				s3.putObject(
				{
					ACL: "public-read",
					ContentType: handler.get_content_type(fname),
					Body: data,
					Bucket: sconfig.s3_bucket_name,
					Key: `${sconfig.s3_images_location}${fname}`,
					CacheControl: `max-age=${sconfig.s3_cache_max_age}`
				}).promise()

				.then(ans =>
				{
					fs.unlink(`${images_root}/${fname}`, function(){})
					handler.do_change_background_image(socket, sconfig.s3_main_url + sconfig.s3_images_location + fname, "hosted")
				})

				.catch(err =>
				{
					fs.unlink(`${images_root}/${fname}`, function(){})
					logger.log_error(err)
				})
			})
		}

		else
		{
			return false
		}
	}

	handler.do_change_background_image = async function(socket, fname, type)
	{
		var info = await db_manager.get_room({_id:socket.hue_room_id}, {background_image:true, background_image_type:true})

		if(type === "hosted")
		{
			if(config.image_storage_s3_or_local === "local")
			{
				var image_url = config.public_images_location + fname
			}

			else if(config.image_storage_s3_or_local === "s3")
			{
				var image_url = fname
			}
		}

		else
		{
			var image_url = fname
		}

		var to_delete = false

		if(info !== "")
		{
			if(info.background_image_type === "hosted")
			{
				to_delete = info.background_image
			}
		}

		var date = Date.now()

		var ans = await db_manager.update_room(socket.hue_room_id,
		{
			background_image: fname,
			background_image_type: type,
			background_image_setter: socket.hue_username,
			background_image_date: date
		})

		handler.room_emit(socket, 'background_image_change',
		{
			username: socket.hue_username,
			background_image: image_url,
			background_image_setter: socket.hue_username,
			background_image_date: date
		})

		if(to_delete)
		{
			if(!to_delete.includes(sconfig.s3_main_url))
			{
				fs.unlink(`${images_root}/${to_delete}`, function(err){})
			}

			else
			{
				s3.deleteObject(
				{
					Bucket: sconfig.s3_bucket_name,
					Key: to_delete.replace(sconfig.s3_main_url, "")
				}).promise()

				.catch(err =>
				{
					logger.log_error(err)
				})
			}
		}

		handler.push_admin_log_message(socket, "changed the background image")
	}

	handler.public.slice_upload = async function(socket, data)
	{
		if(data.action === "image_upload")
		{
			if(!handler.check_permission(socket, "images"))
			{
				return false
			}
		}

		if(data.data.length > config.upload_slice_size)
		{
			return handler.get_out(socket)
		}

		var key = `${socket.hue_user_id}_${data.date}`

		var file = files[key]

		if(!file)
		{
			var spam_ans = await handler.add_spam(socket)

			if(!spam_ans)
			{
				return false
			}

			if(!image_types.includes(data.type))
			{
				return handler.get_out(socket)
			}

			var ext = data.name.split('.').pop(-1).toLowerCase()

			if(!handler.valid_image_extension(ext))
			{
				return handler.get_out(socket)
			}

			data.extension = ext

			files[key] = Object.assign({}, files_struct, data)

			file = files[key]

			file.data = []
		}

		if(file.cancelled)
		{
			delete files[key]
			return false
		}

		data.data = new Buffer(new Uint8Array(data.data))

		file.data.push(data.data)

		file.slice++

		file.received += data.data.length

		var fsize = file.received / 1024

		if(fsize > config.max_image_size)
		{
			delete files[key]
			return handler.get_out(socket)
		}

		var spsize = Math.floor(fsize / (config.max_image_size / 20))

		if(file.spsize !== spsize)
		{
			var spam_ans = await handler.add_spam(socket)

			if(!spam_ans)
			{
				return false
			}

			file.spsize = spsize
		}

		file.updated = Date.now()

		if(file.slice * config.upload_slice_size >= file.size)
		{
			handler.user_emit(socket, 'upload_ended', {date:data.date})

			var full_file = Buffer.concat(file.data)

			if(data.action === "image_upload")
			{
				handler.upload_image(socket,
				{
					image_file: full_file,
					extension: file.extension
				})
			}

			else if(data.action === "profile_image_upload")
			{
				handler.upload_profile_image(socket,
				{
					image_file: full_file
				})
			}

			else if(data.action === "background_image_upload")
			{
				handler.upload_background_image(socket,
				{
					image_file: full_file,
					extension: file.extension
				})
			}

			delete files[key]
		}

		else
		{
			handler.user_emit(socket, 'request_slice_upload',
			{
				current_slice: file.slice,
				date: data.date
			})
		}
	}

	handler.public.cancel_upload = function(socket, data)
	{
		var key = `${socket.hue_user_id}_${data.date}`

		var file = files[key]

		if(file)
		{
			file.cancelled = true
		}
	}

	handler.public.typing = async function(socket, data)
	{
		if(!handler.check_permission(socket, "chat"))
		{
			return false
		}

		socket.hue_typing_counter += 1

		if(socket.hue_typing_counter >= 100)
		{
			var spam_ans = await handler.add_spam(socket)

			if(!spam_ans)
			{
				return false
			}

			socket.hue_typing_counter = 0
		}

		handler.broadcast_emit(socket, 'typing', {username:socket.hue_username})
	}

	handler.public.whisper = function(socket, data)
	{
		if(data.username === undefined)
		{
			return handler.get_out(socket)
		}

		if(data.username.length === 0)
		{
			return handler.get_out(socket)
		}

		if(data.username.length > config.max_max_username_length)
		{
			return handler.get_out(socket)
		}

		if(data.username === socket.hue_username)
		{
			return handler.get_out(socket)
		}

		if(data.message === undefined)
		{
			return handler.get_out(socket)
		}

		if(data.message.length === 0)
		{
			if(!data.draw_coords)
			{
				return handler.get_out(socket)
			}
		}

		if(data.message.length > config.max_input_length)
		{
			return handler.get_out(socket)
		}

		if(data.message !== utilz.clean_string2(data.message))
		{
			return handler.get_out(socket)
		}

		if(data.draw_coords === undefined)
		{
			return handler.get_out(socket)
		}

		if(JSON.stringify(data.draw_coords).length > config.draw_coords_max_length)
		{
			return handler.get_out(socket)
		}

		if(!handler.check_permission(socket, "chat"))
		{
			return false
		}

		var sockets = handler.get_user_sockets_per_room_by_username(socket.hue_room_id, data.username)

		if(sockets.length > 0)
		{
			for(var socc of sockets)
			{
				handler.user_emit(socc, 'whisper',
				{
					room: socket.hue_room_id,
					username: socket.hue_username,
					message: data.message,
					draw_coords: data.draw_coords
				})
			}
		}

		else
		{
			handler.user_emit(socket, 'user_not_in_room', {})
		}
	}

	handler.public.whisper_ops = function(socket, data)
	{
		if(!handler.is_admin_or_op(socket))
		{
			return handler.get_out(socket)
		}

		if(data.message === undefined)
		{
			return handler.get_out(socket)
		}

		if(data.message.length === 0)
		{
			if(!data.draw_coords)
			{
				return handler.get_out(socket)
			}
		}

		if(data.message.length > config.max_input_length)
		{
			return handler.get_out(socket)
		}

		if(data.message !== utilz.clean_string2(data.message))
		{
			return handler.get_out(socket)
		}

		if(data.draw_coords === undefined)
		{
			return handler.get_out(socket)
		}

		if(JSON.stringify(data.draw_coords).length > config.draw_coords_max_length)
		{
			return handler.get_out(socket)
		}

		var sockets = handler.get_room_sockets(socket.hue_room_id)

		for(var socc of sockets)
		{
			if(handler.is_admin_or_op(socc))
			{
				handler.user_emit(socc, 'whisper_ops',
				{
					room: socket.hue_room_id,
					username: socket.hue_username,
					message: data.message,
					draw_coords: data.draw_coords
				})
			}
		}
	}

	handler.public.room_broadcast = function(socket, data)
	{
		if(!handler.is_admin_or_op(socket))
		{
			return handler.get_out(socket)
		}

		if(data.message === undefined)
		{
			return false
		}

		if(data.message.length === 0)
		{
			if(!data.draw_coords)
			{
				return handler.get_out(socket)
			}
		}

		if(data.message.length > config.max_input_length)
		{
			return handler.get_out(socket)
		}

		if(data.message !== utilz.clean_string2(data.message))
		{
			return handler.get_out(socket)
		}

		if(data.draw_coords === undefined)
		{
			return handler.get_out(socket)
		}

		if(JSON.stringify(data.draw_coords).length > config.draw_coords_max_length)
		{
			return handler.get_out(socket)
		}

		handler.room_emit(socket, 'room_broadcast',
		{
			message: data.message,
			username: socket.hue_username,
			draw_coords: data.draw_coords
		})
	}

	handler.public.system_broadcast = function(socket, data)
	{
		if(!socket.hue_superuser)
		{
			return handler.get_out(socket)
		}

		if(data.message === undefined)
		{
			return false
		}

		if(data.message.length === 0)
		{
			if(!data.draw_coords)
			{
				return handler.get_out(socket)
			}
		}

		if(data.message.length > config.max_input_length)
		{
			return handler.get_out(socket)
		}

		if(data.message !== utilz.clean_string2(data.message))
		{
			return handler.get_out(socket)
		}

		if(data.draw_coords === undefined)
		{
			return handler.get_out(socket)
		}

		if(JSON.stringify(data.draw_coords).length > config.draw_coords_max_length)
		{
			return handler.get_out(socket)
		}

		handler.system_emit(socket, 'system_broadcast',
		{
			message: data.message,
			draw_coords: data.draw_coords
		})
	}

	handler.public.system_restart_signal = function(socket, data)
	{
		if(!socket.hue_superuser)
		{
			return handler.get_out(socket)
		}

		handler.system_emit(socket, 'system_restart_signal', {})
	}

	handler.public.disconnect_others = function(socket, data)
	{
		var amount = 0

		for(var room_id of user_rooms[socket.hue_user_id])
		{
			for(var socc of handler.get_user_sockets_per_room(room_id, socket.hue_user_id))
			{
				if(socc.id !== socket.id)
				{
					socc.disconnect()
					amount += 1
				}
			}
		}

		handler.user_emit(socket, 'othersdisconnected', {amount:amount})
	}

	handler.public.ping_server = function(socket, data)
	{
		handler.user_emit(socket, 'pong_received', {date:data.date})
	}

	handler.public.send_reaction = function(socket, data)
	{
		if(data.reaction_type === undefined)
		{
			return handler.get_out(socket)
		}

		if(!reaction_types.includes(data.reaction_type))
		{
			return handler.get_out(socket)
		}

		if(!handler.check_permission(socket, "chat"))
		{
			return false
		}

		handler.room_emit(socket, 'reaction_received', 
		{
			username: socket.hue_username, 
			reaction_type: data.reaction_type,
			profile_image: socket.hue_profile_image
		})

		rooms[socket.hue_room_id].activity = true

		rooms[socket.hue_room_id].modified = Date.now()

		if(rooms[socket.hue_room_id].log)
		{
			var message =
			{
				type: "reaction",
				data:
				{
					username: socket.hue_username,
					reaction_type: data.reaction_type,
					profile_image: socket.hue_profile_image
				},
				date: Date.now()
			}

			rooms[socket.hue_room_id].log_messages.push(message)
		}
	}

	handler.public.join_voice_chat = function(socket, data)
	{
		if(!handler.check_permission(socket, "voice_chat"))
		{
			return false
		}

		var connected = rooms[socket.hue_room_id].voice_chat_sockets

		for(var socc of connected)
		{
			if(socc.hue_user_id === socket.hue_user_id)
			{
				return false
			}
		}

		connected.push(socket)

		var userlist = []

		for(var socc of connected)
		{
			userlist.push(socc.hue_user_id)
		}

		handler.room_emit(socket, "voice_chat_user_connected", {user_id:socket.hue_user_id})
	}

	handler.voice_chat_disconnect_socket = function(socket)
	{
		var connected = rooms[socket.hue_room_id].voice_chat_sockets

		var disconnected = false

		for(var i=0; i<connected.length; i++)
		{
			var u = connected[i]

			if(u.hue_user_id === socket.hue_user_id)
			{
				connected.splice(i, 1)
				disconnected = true
				break
			}
		}

		if(disconnected)
		{
			handler.room_emit(socket, "voice_chat_user_disconnected", {user_id:socket.hue_user_id})
		}
	}

	handler.public.leave_voice_chat = function(socket, data)
	{
		handler.voice_chat_disconnect_socket(socket)
	}

	handler.public.voice_chat_blob = async function(socket, data)
	{
		if(!handler.check_permission(socket, "voice_chat"))
		{
			handler.voice_chat_disconnect_socket(socket)
			return false
		}

		if(data.array_buffer.length / 1024 > config.max_microphone_chunk_size)
		{
			return handler.get_out(socket)
		}

		socket.hue_voice_chat_counter += 1

		if(socket.hue_voice_chat_counter >= 100)
		{
			var spam_ans = await handler.add_spam(socket)

			if(!spam_ans)
			{
				return false
			}

			socket.hue_voice_chat_counter = 0
		}

		var connected = rooms[socket.hue_room_id].voice_chat_sockets

		for(var socc of connected)
		{
			if(socc.hue_user_id !== socket.hue_user_id)
			{
				handler.user_emit(socc, "voice_chat_blob_received", 
				{
					user_id: socket.hue_user_id, 
					array_buffer: data.array_buffer
				})
			}
		}

		handler.user_emit(socket, "voice_chat_blob_received_feedback", {})
	}

	handler.public.get_admin_activity = async function(socket, data)
	{
		if(!handler.is_admin_or_op(socket))
		{
			return handler.get_out(socket)
		}

		var info = await db_manager.get_room({_id:socket.hue_room_id}, {})

		handler.user_emit(socket, "receive_admin_activity", {messages:info.admin_log_messages})
	}

	handler.check_permission = function(socket, permission)
	{
		if(media_types.includes(permission))
		{
			if(rooms[socket.hue_room_id][`${permission}_mode`] !== "enabled")
			{
				return false
			}
		}

		if(handler.is_admin_or_op(socket))
		{
			return true
		}

		else if(vtypes.includes(socket.hue_role))
		{
			if(rooms[socket.hue_room_id][`${socket.hue_role}_${permission}_permission`])
			{
				return true
			}

			return false
		}

		else
		{
			return false
		}
	}

	handler.create_room_object = function(info)
	{
		var obj =
		{
			_id: info._id.toString(),
			activity: false,
			log: info.log,
			log_messages: [],
			admin_log_messages: [],
			userlist: {},
			voice1_chat_permission: info.voice1_chat_permission,
			voice1_images_permission: info.voice1_images_permission,
			voice1_tv_permission: info.voice1_tv_permission,
			voice1_radio_permission: info.voice1_radio_permission,
			voice1_voice_chat_permission: info.voice1_voice_chat_permission,
			voice2_chat_permission: info.voice2_chat_permission,
			voice2_images_permission: info.voice2_images_permission,
			voice2_tv_permission: info.voice2_tv_permission,
			voice2_radio_permission: info.voice2_radio_permission,
			voice2_voice_chat_permission: info.voice2_voice_chat_permission,
			voice3_chat_permission: info.voice3_chat_permission,
			voice3_images_permission: info.voice3_images_permission,
			voice3_tv_permission: info.voice3_tv_permission,
			voice3_radio_permission: info.voice3_radio_permission,
			voice3_voice_chat_permission: info.voice3_voice_chat_permission,
			voice4_chat_permission: info.voice4_chat_permission,
			voice4_images_permission: info.voice4_images_permission,
			voice4_tv_permission: info.voice4_tv_permission,
			voice4_radio_permission: info.voice4_radio_permission,
			voice4_voice_chat_permission: info.voice4_voice_chat_permission,
			images_mode: info.images_mode,
			tv_mode: info.tv_mode,
			radio_mode: info.radio_mode,
			voice_chat_mode: info.voice_chat_mode,
			voice_chat_sockets: [],
			current_image_source: info.image_source,
			current_tv_source: info.tv_source,
			current_radio_source: info.radio_source,
			topic: info.topic,
			name: info.name,
			public: info.public,
			modified: Date.now()
		}

		return obj
	}

	handler.start_room_loop = function()
	{
		setInterval(function()
		{
			try
			{
				for(var key in rooms)
				{
					var room = rooms[key]

					if(room.activity)
					{
						var has_data = false

						if(room.log_messages.length > 0)
						{
							db_manager.push_log_messages(room._id, room.log_messages)
							room.log_messages = []
							has_data = true
						}

						if(room.admin_log_messages.length > 0)
						{
							db_manager.push_admin_log_messages(room._id, room.admin_log_messages)
							room.admin_log_messages = []
							has_data = true
						}

						if(!has_data)
						{
							db_manager.update_room(room._id, {})
						}

						room.activity = false
					}

					if(Object.keys(room.userlist).length === 0)
					{
						delete rooms[key]
						continue
					}
				}
			}

			catch(err)
			{
				logger.log_error(err)
			}
		}, config.room_loop_interval)
	}

	handler.start_files_loop = function()
	{
		setInterval(function()
		{
			try
			{
				for(var key in files)
				{
					var file = files[key]

					if((Date.now() - file.updated) > config.files_loop_max_diff)
					{
						delete files[key]
					}
				}
			}

			catch(err)
			{
				logger.log_error(err)
			}
		}, config.files_loop_interval)
	}

	handler.user_already_connected = function(socket)
	{
		try
		{
			if(io.sockets.adapter.rooms[socket.hue_room_id] === undefined)
			{
				return false
			}

			var sockets = handler.get_room_sockets(socket.hue_room_id)

			for(var socc of sockets)
			{
				if(socc.id !== socket.id && socc.hue_user_id === socket.hue_user_id)
				{
					return true
				}
			}

			return false
		}

		catch(err)
		{
			logger.log_error(err)
		}
	}

	handler.get_user_sockets_per_room = function(room_id, user_id)
	{
		try
		{
			var clients = []

			var sockets = handler.get_room_sockets(room_id)

			for(var socc of sockets)
			{
				if(socc.hue_user_id === user_id)
				{
					clients.push(socc)
				}
			}

			return clients
		}

		catch(err)
		{
			logger.log_error(err)
		}
	}

	handler.get_user_sockets_per_room_by_username = function(room_id, username)
	{
		try
		{
			var clients = []

			var sockets = handler.get_room_sockets(room_id)

			for(var socc of sockets)
			{
				if(socc.hue_username === username)
				{
					clients.push(socc)
				}
			}

			return clients
		}

		catch(err)
		{
			logger.log_error(err)
		}
	}

	handler.get_room_sockets = function(room_id)
	{
		try
		{
			var sockets = []

			var ids = Object.keys(io.sockets.adapter.rooms[room_id].sockets)

			for(var id of ids)
			{
				var socc = io.sockets.connected[id]

				if(socc)
				{
					sockets.push(socc)
				}
			}

			return sockets
		}

		catch(err)
		{
			logger.log_error(err)
		}
	}

	handler.update_user_in_userlist = function(socket)
	{
		try
		{
			var user = rooms[socket.hue_room_id].userlist[socket.hue_user_id]

			user.user_id = socket.hue_user_id
			user.username = socket.hue_username
			user.role = socket.hue_role
			user.profile_image = socket.hue_profile_image
			user.email = socket.hue_email
		}

		catch(err)
		{
			logger.log_error(err)
		}
	}

	handler.get_out = function(socket)
	{
		try
		{
			handler.user_emit(socket, 'redirect', {location:config.redirect_url})
			handler.do_disconnect(socket)

			return false
		}

		catch(err)
		{
			logger.log_error(err)
		}
	}

	handler.get_content_type = function(fname)
	{
		if(typeof fname !== "string")
		{
			return "image/jpeg"
		}

		if(fname.length === 0)
		{
			return "image/jpeg"
		}

		var split = fname.split('.')

		var ext = split[split.length - 1]

		if(ext === "jpg" || ext === "jpeg")
		{
			return "image/jpeg"
		}

		else if(ext === "png")
		{
			return "image/png"
		}

		else if(ext === "gif")
		{
			return "image/gif"
		}

		else
		{
			return "image/jpeg"
		}
	}

	handler.valid_image_extension = function(ext)
	{
		if(image_extensions.includes(ext))
		{
			return true
		}

		return false
	}

	handler.check_multipe_joins = function(socket)
	{
		try
		{
			var sockets = handler.get_room_sockets(socket.hue_room_id)

			for(var socc of sockets)
			{
				if(socc.hue_user_id !== undefined)
				{
					if(socc.id !== socket.id && socc.hue_user_id === socket.hue_user_id)
					{
						if(socc.hue_joining === true)
						{
							return true
						}
					}
				}
			}
		}

		catch(err)
		{
			return true
			logger.log_error(err)
		}
	}

	handler.user_emit = function(socket, type, args={})
	{
		args.type = type
		args.room = socket.hue_room_id

		socket.emit('update', args)
	}

	handler.room_emit = function(socket, type, args={})
	{
		if(typeof socket === "object")
		{
			var room_id = socket.hue_room_id
		}

		else
		{
			var room_id = socket
		}

		args.type = type

		io.sockets.in(room_id).emit('update', args)
	}

	handler.broadcast_emit = function(socket, type, args={})
	{
		if(typeof socket === "object")
		{
			var room_id = socket.hue_room_id
		}

		else
		{
			var room_id = socket
		}

		args.type = type

		socket.broadcast.in(room_id).emit('update', args)
	}

	handler.system_emit = function(socket, type, args={})
	{
		args.type = type
		io.emit('update', args)
	}

	handler.add_spam = async function(socket)
	{
		try
		{
			await antiSpam.addSpam(socket)
			return true
		}

		catch(err)
		{
			return false
		}
	}

	handler.check_data = function(data)
	{
		try
		{
			var m = data.server_method_name

			if(m === undefined)
			{
				return false
			}

			var keys = Object.keys(data)

			if(keys.length > config.data_max_items)
			{
				return false
			}

			for(key of keys)
			{
				var d = data[key]

				var td = typeof d

				if(td === "function")
				{
					return false
				}

				if(m === "slice_upload")
				{
					if(key === "data")
					{
						continue
					}
				}

				if(m === "voice_chat_blob")
				{
					if(key === "array_buffer")
					{
						continue
					}
				}

				var s = JSON.stringify(d)

				if(td === "number")
				{
					if(s.length > config.data_items_max_number_length)
					{
						return false
					}
				}

				else
				{
					if(key === "draw_coords")
					{
						if(s.length > config.draw_coords_max_length)
						{
							return false
						}
					}

					else
					{
						if(s.length > config.data_items_max_string_length)
						{
							return false
						}
					}
				}
			}

			return true
		}

		catch(err)
		{
			return false
		}
	}

	handler.is_admin_or_op = function(socket)
	{
		return socket.hue_role === 'admin' || socket.hue_role === 'op'
	}

	handler.prepare_userlist = function(userlist)
	{
		var userlist2 = []

		for(var key in userlist)
		{
			var item = userlist[key]

			userlist2.push
			({
				user_id: item.user_id,
				username: item.username,
				role: item.role,
				profile_image: item.profile_image
			})
		}

		return userlist2
	}

	handler.prepare_voice_chat_userlist = function(sockets)
	{
		var userlist2 = []

		for(var socc of sockets)
		{
			userlist2.push(socc.hue_user_id)
		}

		return userlist2
	}

	handler.push_admin_log_message = function(socket, content)
	{
		rooms[socket.hue_room_id].activity = true

		rooms[socket.hue_room_id].modified = Date.now()

		var message =
		{
			type: "admin_activity",
			data:
			{
				username: socket.hue_username,
				content: content
			},
			date: Date.now()
		}

		rooms[socket.hue_room_id].admin_log_messages.push(message)
	}

	handler.start_room_loop()
	handler.start_files_loop()
}

module.exports = handler
