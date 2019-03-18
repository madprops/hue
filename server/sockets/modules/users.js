module.exports = function(handler, vars, io, db_manager, config, sconfig, utilz, logger)
{
    // Handles role changes
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

        if(!vars.roles.includes(data.role))
        {
            return handler.get_out(socket)
        }

        if(!socket.hue_superuser && (socket.hue_username === data.username))
        {
            return handler.get_out(socket)
        }

        let info = await db_manager.get_room({_id:socket.hue_room_id}, {keys:1})
        let userinfo = await db_manager.get_user({username:data.username}, {username:1})

        if(!userinfo)
        {
            handler.user_emit(socket, 'user_not_found', {})
            return false
        }

        let id = userinfo._id.toString()
        let current_role = info.keys[id]

        if(!socket.hue_superuser)
        {
            if((current_role === 'admin' || current_role === 'op') && socket.hue_role !== 'admin')
            {
                handler.user_emit(socket, 'forbidden_user', {})
                return false
            }
        }

        if(current_role === data.role || (current_role === undefined && data.role === "voice1"))
        {
            handler.user_emit(socket, 'is_already', {what:data.role, who:data.username})
            return false
        }

        let sockets = handler.get_user_sockets_per_room(socket.hue_room_id, id)
        let last_socc = false

        for(let socc of sockets)
        {
            if(socc.hue_superuser)
            {
                if(socket.hue_username !== socc.hue_username && socc.hue_role === "admin")
                {
                    handler.user_emit(socket, 'forbidden_user', {})
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

        handler.push_admin_log_message(socket, `changed the role of "${data.username}" to "${data.role}"`)
    }

    // Handles voice resets
    handler.public.reset_voices = async function(socket, data)
    {
        if(!handler.is_admin_or_op(socket))
        {
            return handler.get_out(socket)
        }

        let info = await db_manager.get_room({_id:socket.hue_room_id}, {keys:1})
        let removed = false

        for(let key in info.keys)
        {
            if(info.keys[key].startsWith("voice") && info.keys[key] !== "voice1")
            {
                delete info.keys[key]
                removed = true
            }
        }

        if(!removed)
        {
            handler.user_emit(socket, 'no_voices_to_reset', {})
            return false
        }

        let sockets = handler.get_room_sockets(socket.hue_room_id)

        for(let socc of sockets)
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

    // Handles ops removal
    handler.public.remove_ops = async function(socket, data)
    {
        if(socket.hue_role !== 'admin')
        {
            return handler.get_out(socket)
        }

        let info = await db_manager.get_room({_id:socket.hue_room_id}, {keys:1})
        let removed = false

        for(let key in info.keys)
        {
            if(info.keys[key] === "op")
            {
                delete info.keys[key]
                removed = true
            }
        }

        if(!removed)
        {
            handler.user_emit(socket, 'no_ops_to_remove', {})
            return false
        }

        let sockets = handler.get_room_sockets(socket.hue_room_id)

        for(let socc of sockets)
        {
            if(socc.hue_role === 'op')
            {
                socc.hue_role = 'voice1'

                handler.update_user_in_userlist(socc)
            }
        }

        handler.room_emit(socket, 'announce_removedops', {username:socket.hue_username})

        db_manager.update_room(info._id, {keys:info.keys})

        handler.push_admin_log_message(socket, "removed the ops")
    }

    // Handles user kicks
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

        let sockets = handler.get_user_sockets_per_room_by_username(socket.hue_room_id, data.username)

        if(sockets.length > 0)
        {
            if(((sockets[0].role === 'admin' || sockets[0].role === 'op') && socket.hue_role !== 'admin') || sockets[0].superuser)
            {
                handler.user_emit(socket, 'forbidden_user', {})
                return false
            }

            for(let socc of sockets)
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

    // Handles user bans
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

        let info = await db_manager.get_room({_id:socket.hue_room_id}, {bans:1, keys:1})
        let userinfo = await db_manager.get_user({username:data.username}, {username:1})

        if(!userinfo)
        {
            handler.user_emit(socket, 'user_not_found', {})
            return false
        }

        let id = userinfo._id.toString()
        let current_role = info.keys[id]

        if((current_role === 'admin' || current_role === 'op') && socket.hue_role !== 'admin')
        {
            handler.user_emit(socket, 'forbidden_user', {})
            return false
        }

        if(info.bans.includes(id))
        {
            handler.user_emit(socket, 'user_already_banned', {})
            return false
        }

        let sockets = handler.get_user_sockets_per_room(socket.hue_room_id, id)

        if(sockets.length > 0)
        {
            for(let socc of sockets)
            {
                if(socc.hue_superuser)
                {
                    handler.user_emit(socket, 'forbidden_user', {})
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

    // Handles user unbans
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

        let info = await db_manager.get_room({_id:socket.hue_room_id}, {bans:1, keys:1})
        let userinfo = await db_manager.get_user({username:data.username}, {username:1})

        if(!userinfo)
        {
            handler.user_emit(socket, 'user_not_found', {})
            return false
        }

        let id = userinfo._id.toString()

        if(!info.bans.includes(id))
        {
            handler.user_emit(socket, 'user_already_unbanned', {})

            return false
        }

        for(let i=0; i<info.bans.length; i++)
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

    // Unbans all banned users
    handler.public.unban_all = async function(socket, data)
    {
        if(!handler.is_admin_or_op(socket))
        {
            return handler.get_out(socket)
        }

        let info = await db_manager.get_room({_id:socket.hue_room_id}, {bans:1})

        if(info.bans.length > 0)
        {
            info.bans = []

            db_manager.update_room(info._id, {bans:info.bans})

            handler.room_emit(socket, 'announce_unban_all', {username:socket.hue_username})

            handler.push_admin_log_message(socket, "unbanned all banned users")
        }

        else
        {
            handler.user_emit(socket, 'nothing_to_unban', {})
        }
    }

    // Sends the number of users banned
    handler.public.get_ban_count = async function(socket, data)
    {
        if(!handler.is_admin_or_op(socket))
        {
            return handler.get_out(socket)
        }

        let info = await db_manager.get_room({_id:socket.hue_room_id}, {bans:1})
        let count

        if(info.bans === '')
        {
            count = 0
        }

        else
        {
            count = info.bans.length
        }

        handler.user_emit(socket, 'receive_ban_count', {count:count})
    }

    // Checks if socket is admin or op
    handler.is_admin_or_op = function(socket)
    {
        return socket.hue_role === 'admin' || socket.hue_role === 'op'
    }

    // Prepares the user list to be sent on room joins
    handler.prepare_userlist = function(userlist)
    {
        let userlist2 = []

        for(let key in userlist)
        {
            let item = userlist[key]

            userlist2.push
            ({
                user_id: item.user_id,
                username: item.username,
                role: item.role,
                profile_image: item.profile_image,
                last_activity_trigger: item.last_activity_trigger,
                date_joined: item.date_joined
            })
        }

        return userlist2
    }

    // Gets a room's userlist
    handler.get_userlist = function(room_id)
    {
        try
        {
            if(vars.rooms[room_id] === undefined)
            {
                return {}
            }

            if(vars.rooms[room_id].userlist !== undefined)
            {
                return vars.rooms[room_id].userlist
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

    // Get's a room's user count
    handler.get_usercount = function(room_id)
    {
        return Object.keys(handler.get_userlist(room_id)).length
    }

    // Sends admin activity list
    handler.public.get_admin_activity = function(socket, data)
    {
        if(!handler.is_admin_or_op(socket))
        {
            return handler.get_out(socket)
        }

        let messages = vars.rooms[socket.hue_room_id].admin_log_messages

        handler.user_emit(socket, "receive_admin_activity", {messages:messages})
    }

    // Sends access log
    handler.public.get_access_log = function(socket, data)
    {
        if(!handler.is_admin_or_op(socket))
        {
            return handler.get_out(socket)
        }

        let messages = vars.rooms[socket.hue_room_id].access_log_messages

        handler.user_emit(socket, "receive_access_log", {messages:messages})
    }

    // Sends admin list
    handler.public.get_admin_list = async function(socket, data)
    {
        if(!handler.is_admin_or_op(socket))
        {
            return handler.get_out(socket)
        }

        let info = await db_manager.get_room({_id:socket.hue_room_id}, {keys:1})
        let roles = {}
        let ids = []

        for(let id in info.keys)
        {
            let role = info.keys[id]

            if(role === "op" || role === "admin")
            {
                roles[id] = role
                ids.push(id)
            }
        }

        if(ids.length === 0)
        {
            handler.user_emit(socket, 'receive_admin_list', {list:[]})
            return false
        }

        let users = await db_manager.get_user({_id:{$in:ids}}, {username:1})

        if(users.length === 0)
        {
            handler.user_emit(socket, 'receive_admin_list', {list:[]})
            return false
        }

        let list = []

        for(let user of users)
        {
            list.push({username:user.username, role:roles[user._id]})
        }

        handler.user_emit(socket, 'receive_admin_list', {list:list})
    }

    // Sends ban list
    handler.public.get_ban_list = async function(socket, data)
    {
        if(!handler.is_admin_or_op(socket))
        {
            return handler.get_out(socket)
        }

        let info = await db_manager.get_room({_id:socket.hue_room_id}, {bans:1})
        let ids = []

        for(let id of info.bans)
        {
            ids.push(id)
        }

        if(ids.length === 0)
        {
            handler.user_emit(socket, 'receive_ban_list', {list:[]})
            return false
        }

        let users = await db_manager.get_user({_id:{$in:ids}}, {username:1})

        if(users.length === 0)
        {
            handler.user_emit(socket, 'receive_ban_list', {list:[]})
            return false
        }

        let list = []

        for(let user of users)
        {
            list.push({username:user.username})
        }

        handler.user_emit(socket, 'receive_ban_list', {list:list})
    }

    // Updates a user's data in the user list
    handler.update_user_in_userlist = function(socket, first=false)
    {
        try
        {
            let user = vars.rooms[socket.hue_room_id].userlist[socket.hue_user_id]

            user.user_id = socket.hue_user_id
            user.username = socket.hue_username
            user.role = socket.hue_role
            user.profile_image = socket.hue_profile_image
            user.email = socket.hue_email
            user.last_activity_trigger = socket.hue_last_activity_trigger

            if(first)
            {
                user.date_joined = Date.now()
            }
        }

        catch(err)
        {
            logger.log_error(err)
        }
    }
}