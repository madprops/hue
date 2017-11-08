module.exports = function(db, config, sconfig, utilz)
{
	const mongo = require('mongodb')
	const bcrypt = require('bcrypt')
	const mailgun = require('mailgun-js')({apiKey: sconfig.mailgun_api_key, domain: sconfig.mailgun_domain})

	const rooms_version = 11
	const users_version = 15

	function get_random_key()
	{
		var text = ""
		var possible = "ABCDEFGHIJKLMnopqrstuvwxyz012345"

		for(var i=0; i < 12; i++)
		{
			text += possible.charAt(Math.floor(Math.random() * possible.length))
		}

		return "_key_" + Date.now() + text
	}

	function get_random_password()
	{
		var text = ""
		var possible = "ABCDEFGHIJKLMnopqrstuvwxyz012345"

		for(var i=0; i < 12; i++)
		{
			text += possible.charAt(Math.floor(Math.random() * possible.length))
		}

		return Date.now() + text
	}

	var manager = {}

	manager.get_room = function(query, fields, callback)
	{
		if(Object.keys(fields).length > 0)
		{
			fields.version = true
		}

		if(query._id !== undefined)
		{
			if(typeof query._id === "string" && query._id !== config.main_room_id)
			{
				try
				{
					query._id = new mongo.ObjectId(query._id)
				}

				catch(err)
				{
					callback(false)
					return
				}
			}
		}

		db.collection("rooms").findOne(query, fields, function(err, room)
		{
			if(!room)
			{
				if(query._id === config.main_room_id)
				{
					manager.create_room({name:config.default_main_room_name, id:config.main_room_id}, function(nri)
					{
						callback(nri)
					})
				}

				return
			}

			if(room && room.version !== rooms_version)
			{
				if(room.name === undefined || typeof room.name !== "string")
				{
					room.name = "No Name"
				}
				
				if(room.image_url === undefined || typeof room.image_url !== "string")
				{
					room.image_url = ""
				}
				
				if(room.image_uploader === undefined || typeof room.image_uploader !== "string")
				{
					room.image_uploader = ""
				}
				
				if(room.image_size === undefined || typeof room.image_size !== "number")
				{
					room.image_size = 0
				}
				
				if(room.image_date === undefined || typeof room.image_date !== "number")
				{
					room.image_date = 0
				}
				
				if(room.topic === undefined || typeof room.topic !== "string")
				{
					room.topic = ""
				}
				
				if(room.topic_setter === undefined || typeof room.topic_setter !== "string")
				{
					room.topic_setter = ""
				}
				
				if(room.topic_date === undefined || typeof room.topic_date !== "number")
				{
					room.topic_date = 0
				}
				
				if(room.claimed === undefined || typeof room.claimed !== "boolean")
				{
					room.claimed = false
				}
				
				if(room.keys === undefined || typeof room.keys !== "string")
				{
					room.keys = ""
				}
				
				if(room.upload_permission === undefined || typeof room.upload_permission !== "number")
				{
					room.upload_permission = 1
				}
				
				if(room.chat_permission === undefined || typeof room.chat_permission !== "number")
				{
					room.chat_permission = 1
				}
				
				if(room.radio_permission === undefined || typeof room.radio_permission !== "number")
				{
					room.radio_permission = 1
				}

				if(room.radio_type === undefined || typeof room.radio_type !== "string")
				{
					room.radio_type = "radio"
				}					
				
				if(room.radio_source === undefined || typeof room.radio_source !== "string")
				{
					room.radio_source = ""
				}

				if(room.radio_title === undefined || typeof room.radio_title !== "string")
				{
					room.radio_title = ""
				}
				
				if(room.radio_setter === undefined || typeof room.radio_setter !== "string")
				{
					room.radio_setter = ""
				}
				
				if(room.radio_date === undefined || typeof room.radio_date !== "number")
				{
					room.radio_date = 0
				}
				
				if(room.bans === undefined || typeof room.bans !== "string")
				{
					room.bans = ""
				}
				
				if(room.modified === undefined || typeof room.modified !== "number")
				{
					room.modified = 0
				}
				
				if(room.public === undefined || typeof room.public !== "boolean")
				{
					room.public = true
				}

				room.version = rooms_version

				db.collection('rooms').update({_id:room._id}, {$set:room})
			}

			callback(room)
		})
	}

	manager.create_room = function(data, callback)
	{
		room = 
		{
			version: rooms_version,
			image_url: '',
			image_uploader: '',
			image_size: 0,
			image_date: 0,
			topic: '',
			topic_setter: '',
			topic_date: 0,
			claimed: true,
			keys: get_random_key(),
			radio_type: 'radio',
			radio_source: '',
			radio_title: '',
			radio_setter: '',
			radio_date: 0,
			bans: '',
			modified: Date.now(),
		}

		if(data.id !== undefined)
		{
			room._id = data.id
		}

		room.name = data.name !== undefined ? data.name : "No Name"
		room.chat_permission = data.chat_permission !== undefined ? data.chat_permission : 1
		room.upload_permission = data.upload_permission !== undefined ? data.upload_permission : 1
		room.radio_permission = data.radio_permission !== undefined ? data.radio_permission : 1
		room.public = data.public !== undefined ? data.public : true

		db.collection('rooms').insertOne(room, function(err, result)
		{
			room.fresh = true
			callback(room)
		})
	}

	manager.update_room = function(_id, fields)
	{
		if(_id !== undefined)
		{
			if(typeof _id === "string" && _id !== config.main_room_id)
			{
				try
				{
					_id = new mongo.ObjectId(_id)
				}

				catch(err)
				{
					return
				}
			}
		}

		db.collection('rooms').update({_id:_id}, {$set:fields})		
	}

	manager.find_rooms = function(query, callback)
	{
		db.collection('rooms').find(query).toArray(function(err, results)
		{
			callback(results)
		})
	}
	
	manager.get_user = function(query, fields, callback)
	{
		if(Object.keys(fields).length > 0)
		{
			fields.version = true
		}

		if(query._id !== undefined)
		{
			if(typeof query._id === "string")
			{
				try
				{
					query._id = new mongo.ObjectId(query._id)
				}

				catch(err)
				{
					callback(false)
					return
				}
			}
		}

		db.collection('users').findOne(query, fields, function(err, user)
		{
			if(user && user.version !== users_version)
			{
				if(user.username === undefined || typeof user.username !== "string")
				{
					db.users.deleteOne({_id: user._id})
				}

				if(user.password === undefined || typeof user.password !== "string")
				{
					db.users.deleteOne({_id: user._id})
				}

				if(user.email === undefined || typeof user.email !== "string")
				{
					user.email = ""
				}

				if(user.room_keys === undefined || typeof user.room_keys !== "object")
				{
					user.room_keys = {}
				}

				if(user.password_reset_date === undefined || typeof user.password_reset_date !== "number")
				{
					user.password_reset_date = 0
				}

				user.version = users_version

				db.collection('users').update({_id:user._id}, {$set:user})					
			}

			callback(user)
		})
	}

	manager.create_user = function(info, callback)
	{
		bcrypt.hash(info.password, config.encryption_cost, function(err, hash) 
		{
			var user = {}

			user =
			{
				version: users_version,
				username: info.username,
				password: hash,
				email: info.email, 
				room_keys: {},
				password_reset_date: Date.now()
			}

			db.collection('users').insertOne(user, function(err, result)
			{
				user.fresh = true
				callback(result)
			})
		})
	}

	manager.update_user = function(_id, fields)
	{
		if(_id !== undefined)
		{
			if(typeof _id === "string")
			{
				try
				{
					_id = new mongo.ObjectId(_id)
				}

				catch(err)
				{
					callback(false)
					return
				}
			}
		}

		if(fields.password !== undefined)
		{
			bcrypt.hash(fields.password, config.encryption_cost, function(err, hash)
			{
				fields.password = hash

				db.collection('users').update({_id:_id}, {$set:fields})
			})
		}

		else
		{
			db.collection('users').update({_id:_id}, {$set:fields})
		}
	}

	manager.check_password = function(username, password, callback)
	{
		manager.get_user({username:username}, {}, function(user)
		{
			if(!user)
			{
				callback(null, false)
			}

			else 
			{
				bcrypt.compare(password, user.password, function(err, valid) 
				{
					callback(user, valid)
				})
			}
		})		
	}

	manager.change_username = function(_id, username, callback)
	{
		manager.get_user({_id:_id}, {}, function(user)
		{
			if(!user)
			{
				callback(false)
			}

			else
			{
				manager.get_user({username:username}, {}, function(user2)
				{
					if(user2)
					{
						callback(false)
					}

					else
					{
						manager.update_user(_id,
						{
							username: username
						})

						callback(true)					
					}
				})
			}
		})
	}

	manager.reset_user_password = function(username, email, callback)
	{
		manager.get_user({username:username}, {}, function(user)
		{
			if(user && user.email === email)
			{
				if((Date.now() - user.password_reset_date) > config.password_reset_limit)
				{
					var new_pass = get_random_password()

					manager.update_user(user._id, {password:new_pass, password_reset_date:Date.now()})

					var data = 
					{
						from: 'Hue <hue@merkoba.com>',
						to: email,
						subject: 'Password Reset',
						text: `The password of your account with username "${username}" has been changed to "${new_pass}"`
					}

					mailgun.messages().send(data, function(error, body) 
					{
						callback("done")
					})
				}

				else
				{
					callback("limit")
				}
			}

			else
			{
				callback(false)
			}
		})
	}

	return manager
}

