// Shows the user's role
Hue.show_role = function()
{
    if(Hue.role === 'admin')
    {
        Hue.feedback('You are an admin')
    }

    else if(Hue.role === 'op')
    {
        Hue.feedback('You are an op')
    }

    else if(Hue.role.startsWith('voice'))
    {
        Hue.feedback(`You have ${Hue.role}`)
    }

    let ps = 0

    if(Hue.can_chat)
    {
        Hue.feedback("You have chat permission")

        ps += 1
    }

    if(Hue.can_images)
    {
        Hue.feedback("You have images permission")

        ps += 1
    }

    if(Hue.can_tv)
    {
        Hue.feedback("You have tv permission")

        ps += 1
    }

    if(Hue.can_radio)
    {
        Hue.feedback("You have radio permission")

        ps += 1
    }

    if(ps === 0)
    {
        Hue.feedback("You cannot interact")
    }
}

// Shows the user's username
Hue.show_username = function()
{
    Hue.feedback(`Username: ${Hue.username}`)
}

// This handles new users joining the room
Hue.userjoin = function(data)
{
    Hue.clear_from_users_to_disconnect(data)

    let added = Hue.add_to_userlist(
    {
        user_id: data.user_id,
        username: data.username,
        role: data.role,
        profile_image: data.profile_image,
        date_joined: data.date_joined
    })

    if(added)
    {
        if(Hue.get_setting("show_joins") && Hue.check_permission(data.role, "chat"))
        {
            Hue.public_feedback(`${data.username} has joined`,
            {
                brk: "<i class='icon2c fa fa-user-plus'></i>",
                save: true,
                username: data.username,
                open_profile: true
            })

            if(data.username !== Hue.username)
            {
                Hue.on_activity("join")
            }
        }
    }
}

// Updates the user count in the header and user list
Hue.update_usercount = function()
{
    let s = `${Hue.utilz.singular_or_plural(Hue.usercount, "Users")} Online`

    $('#usercount').text(s)

    if(Hue.userlist_mode === "normal")
    {
        Hue.msg_userlist.set_title(s)
    }
}

// Adds a user to the user list
Hue.add_to_userlist = function(args={})
{
    let def_args =
    {
        user_id: false,
        username: false,
        role: false,
        profile_image: false,
        date_joined: false
    }

    args = Object.assign(def_args, args)

    for(let i=0; i<Hue.userlist.length; i++)
    {
        if(Hue.userlist[i].user_id === args.user_id)
        {
            Hue.userlist[i].user_id = args.user_id
            Hue.userlist[i].username = args.username
            Hue.userlist[i].role = args.role
            Hue.userlist[i].profile_image = args.profile_image

            Hue.update_userlist()

            return false
        }
    }

    Hue.userlist.push(
    {
        user_id: args.user_id,
        username: args.username,
        role: args.role,
        profile_image: args.profile_image,
        date_joined: args.date_joined
    })

    Hue.update_userlist()

    return true
}

// Removes a user from the user list
Hue.remove_from_userlist = function(user_id)
{
    for(let i=0; i<Hue.userlist.length; i++)
    {
        if(Hue.userlist[i].user_id === user_id)
        {
            Hue.userlist.splice(i, 1)
            Hue.update_userlist()
            break
        }
    }
}

// Replaces the username of a user in the user list with a new username
Hue.replace_uname_in_userlist = function(oldu, newu)
{
    for(let i=0; i<Hue.userlist.length; i++)
    {
        if(Hue.userlist[i].username === oldu)
        {
            Hue.userlist[i].username = newu
            break
        }
    }

    Hue.update_userlist()
}

// Replaces the role of a user in the user list with a new role
Hue.replace_role_in_userlist = function(uname, rol)
{
    for(let i=0; i<Hue.userlist.length; i++)
    {
        if(Hue.userlist[i].username === uname)
        {
            Hue.userlist[i].role = rol
            break
        }
    }

    Hue.update_userlist()
}

// Gets the role of a user by username
Hue.get_role = function(uname)
{
    for(let i=0; i<Hue.userlist.length; i++)
    {
        if(Hue.userlist[i].username === uname)
        {
            return Hue.userlist[i].role
        }
    }
}

// Sets all voice roles to voice1
Hue.reset_voices_userlist = function()
{
    for(let i=0; i<Hue.userlist.length; i++)
    {
        if(Hue.userlist[i].role.startsWith('voice') && Hue.userlist[i].role !== 'voice1')
        {
            Hue.userlist[i].role = 'voice1'
        }
    }

    Hue.update_userlist()
}

// Sets all op roles to voice1
Hue.remove_ops_userlist = function()
{
    for(let i=0; i<Hue.userlist.length; i++)
    {
        if(Hue.userlist[i].role === 'op')
        {
            Hue.userlist[i].role = 'voice1'
        }
    }

    Hue.update_userlist()
}

// Gets the short form of a specified role
// These are displayed next to the usernames in the user list
Hue.role_tag = function(p)
{
    let s

    if(p === 'admin')
    {
        s = '[A]'
    }

    else if(p === 'op')
    {
        s = '[O]'
    }

    else if(p === 'voice1')
    {
        s = '[V1]'
    }

    else if(p === 'voice2')
    {
        s = '[V2]'
    }

    else if(p === 'voice3')
    {
        s = '[V3]'
    }

    else if(p === 'voice4')
    {
        s = '[V4]'
    }

    else
    {
        s = ''
    }

    return s
}

// Gets the full proper name of a specified role
Hue.get_pretty_role_name = function(p)
{
    let s

    if(p === 'admin')
    {
        s = 'Admin'
    }

    else if(p === 'op')
    {
        s = 'Operator'
    }

    else if(p === 'voice1')
    {
        s = 'Voice 1'
    }

    else if(p === 'voice2')
    {
        s = 'Voice 2'
    }

    else if(p === 'voice3')
    {
        s = 'Voice 3'
    }

    else if(p === 'voice4')
    {
        s = 'Voice 4'
    }

    else
    {
        s = ''
    }

    return s
}

// Gets a user from the user list by username
Hue.get_user_by_username = function(uname)
{
    for(let user of Hue.userlist)
    {
        if(user.username === uname)
        {
            return user
        }
    }

    return false
}

// Gets a user from the user list by ID
Hue.get_user_by_id = function(id)
{
    for(let user of Hue.userlist)
    {
        if(user.user_id === id)
        {
            return user
        }
    }

    return false
}

// Starts click events for usernames in the user list
Hue.start_userlist_click_events = function()
{
    $("#userlist").on("click", ".ui_item_uname", function()
    {
        let uname = $(this).text()

        if(Hue.userlist_mode === "normal")
        {
            Hue.show_profile(uname)
        }

        else if(Hue.userlist_mode === "whisper")
        {
            Hue.update_whisper_users(uname)
        }
    })
}

// Handles a user list update
// Rebuilds the HTML of the user list window
Hue.update_userlist = function()
{
    let s = $()

    s = s.add()
    Hue.userlist.sort(Hue.compare_userlist)
    Hue.usernames = []

    for(let i=0; i<Hue.userlist.length; i++)
    {
        let item = Hue.userlist[i]

        Hue.usernames.push(item.username)

        let h = $("<div class='modal_item userlist_item'><span class='ui_item_role'></span><span class='ui_item_uname action dynamic_title'></span></div>")
        let p = Hue.role_tag(item.role)
        let pel = h.find('.ui_item_role').eq(0)

        pel.text(p)

        if(p === "")
        {
            pel.css("padding-right", 0)
        }

        let uname = h.find('.ui_item_uname')

        uname.eq(0).text(item.username)

        let t = `Joined: ${Hue.utilz.nice_date(item.date_joined)}`

        uname.attr("title", t)
        uname.data("otitle", t)
        uname.data("date", item.date_joined)

        s = s.add(h)
    }

    Hue.usercount = Hue.userlist.length
    Hue.update_usercount()

    $('#userlist').html(s)

    if(Hue.userlist_filtered)
    {
        Hue.do_modal_filter()
    }
}

// Used to sort the user list by order of roles
// Admins at the top, voice1 at the bottom, etc
// It sorts in alphabetical order on equal roles
Hue.compare_userlist = function(a, b)
{
    if(a.role === '')
    {
        a.role = 'voice1'
    }

    if(b.role === '')
    {
        b.role = 'voice1'
    }

    if(a.role.startsWith('voice') && b.role.startsWith('voice'))
    {
        if(a.role < b.role)
        {
            return 1
        }

        else if(a.role > b.role)
        {
            return -1
        }

        if(a.username > b.username)
        {
            return -1
        }

        else if(a.username < b.username)
        {
            return 1
        }

        else
        {
            return 0
        }
    }

    else
    {
        if(a.role > b.role)
        {
            return 1
        }

        else if(a.role < b.role)
        {
            return -1
        }

        if(a.username < b.username)
        {
            return -1
        }

        else if(a.username > b.username)
        {
            return 1
        }

        else
        {
            return 0
        }
    }
}

// Checks if a user is controllable
// Basically a user's role is below the user's role
// An admin can control other admins
Hue.user_is_controllable = function(user)
{
    if(user.user_id === Hue.user_id)
    {
        return true
    }
    
    if(!Hue.is_admin_or_op())
    {
        return false
    }

    if((user.role === 'admin' || user.role === 'op') && Hue.role !== 'admin')
    {
        return false
    }

    return true
}

// Shows the user list
Hue.show_userlist = function(mode="normal", filter=false)
{
    Hue.userlist_mode = mode

    if(mode === "normal")
    {
        Hue.update_usercount()
    }

    else if(mode === "whisper")
    {
        Hue.msg_userlist.set_title("Add or Remove a User")
    }

    Hue.msg_userlist.show(function()
    {
        if(filter)
        {
            $("#userlist_filter").val(filter)
            Hue.do_modal_filter()
        }
    })
}

// Sorts a user list by activity date
Hue.sort_userlist_by_activity_trigger = function(a, b)
{
    if(a.last_activity_trigger < b.last_activity_trigger)
    {
        return -1
    }

    if(a.last_activity_trigger > b.last_activity_trigger)
    {
        return 1
    }

    return 0
}

// Updates the profile image of a user in the userlist
Hue.update_user_profile_image = function(uname, pi)
{
    for(let i=0; i<Hue.userlist.length; i++)
    {
        let user = Hue.userlist[i]

        if(user.username === uname)
        {
            Hue.userlist[i].profile_image = pi
            return
        }
    }
}

// Gets the ignored usernames list
Hue.get_ignored_usernames_list = function()
{
    let list = Hue.get_setting("ignored_usernames").split("\n")

    if(list.length === 1 && !list[0])
    {
        list = []
    }

    Hue.ignored_usernames_list =  list
}

// Sets the initial state of the activity bar
// Setups events for the activity bar
Hue.setup_activity_bar = function()
{
    let sorted_userlist = Hue.userlist.slice(0)

    sorted_userlist.sort(Hue.sort_userlist_by_activity_trigger)

    for(let user of sorted_userlist)
    {
        Hue.push_to_activity_bar(user.username, user.last_activity_trigger)
    }

    setInterval(function()
    {
        Hue.check_activity_bar()
    }, Hue.config.activity_bar_interval)

    setInterval(function()
    {
        if(Hue.app_focused)
        {
            Hue.trigger_activity()
        }
    }, Hue.config.activity_bar_trigger_interval)

    if(Hue.get_setting("activity_bar"))
    {
        Hue.show_activity_bar()
    }

    else
    {
        Hue.hide_activity_bar()
    }

    $("#activity_bar_container").on("click", ".activity_bar_item", function()
    {
        Hue.show_profile($(this).data("username"))
    })
}

// Checks if the activity list has changed and the activity bar must be updated
Hue.check_activity_bar = function(update=true)
{
    if(Hue.activity_list.length === 0)
    {
        return false
    }

    let d = Date.now() - Hue.config.max_activity_bar_delay
    let new_top = []
    let changed = false

    for(let item of Hue.activity_list)
    {
        let user = Hue.get_user_by_username(item.username)

        if
        (
            item.date > d &&
            user &&
            !Hue.user_is_ignored(item.username)
        )
        {
            new_top.push(item)
        }

        else
        {
            changed = true
        }
    }

    if(changed)
    {
        Hue.activity_list = new_top

        if(update)
        {
            Hue.update_activity_bar()
        }
    }

    return changed
}

// Toggles the visibility of the activity bar
Hue.toggle_activity_bar = function()
{
    let new_setting

    if(Hue.get_setting("activity_bar"))
    {
        Hue.hide_activity_bar()
        new_setting = false
    }

    else
    {
        Hue.show_activity_bar()
        new_setting = true
    }

    Hue.enable_setting_override("activity_bar")
    Hue.modify_setting(`activity_bar ${new_setting}`, false)
}

// Shows the activity bar
Hue.show_activity_bar = function()
{
    $("#activity_bar_container").css("display", "block")
    $("#topbox_left_icon").removeClass("fa-caret-up")
    $("#topbox_left_icon").addClass("fa-caret-down")

    $("#synth_container").css("top", "4rem")
    $("#recent_voice_box").css("top", "4rem")
    $("#infotip_container").css("top", "4rem")

    Hue.apply_theme()
    Hue.update_activity_bar()
    Hue.on_resize()
}

// Hides the activity bar
Hue.hide_activity_bar = function()
{
    $("#activity_bar_container").css("display", "none")
    $("#topbox_left_icon").removeClass("fa-caret-down")
    $("#topbox_left_icon").addClass("fa-caret-up")

    $("#synth_container").css("top", "2rem")
    $("#recent_voice_box").css("top", "2rem")
    $("#infotip_container").css("top", "2rem")

    Hue.apply_theme()
    Hue.on_resize()
}

// Updates the activity bar
// If items are still in the list they are not removed
// This is to keep states like profile image rotation from being interrupted
Hue.update_activity_bar = function()
{
    if(!Hue.get_setting("activity_bar"))
    {
        return false
    }

    let c = $("#activity_bar_content")

    if(Hue.activity_list.length === 0)
    {
        $("#activity_bar_no_activity").css("display", "block")
        return false
    }

    $("#activity_bar_no_activity").css("display", "none")

    let usernames_included = []

    $(".activity_bar_item").each(function()
    {
        let username = $(this).data("username")
        let user = Hue.get_user_by_username(username)

        if(user && Hue.activity_list.some(item => item.username === username))
        {
            usernames_included.push(username)
        }

        else
        {
            $(this).remove()
        }
    })

    if(Hue.activity_list.length > usernames_included.length)
    {
        for(let item of Hue.activity_list)
        {
            if(usernames_included.includes(item.username))
            {
                continue
            }

            let user = Hue.get_user_by_username(item.username)

            if(user)
            {
                let pi = user.profile_image || Hue.config.default_profile_image_url

                let h = $(`
                <div class='activity_bar_item'>
                    <div class='activity_bar_image_container round_image_container action4'>
                        <img class='activity_bar_image' src='${pi}'>
                    </div>
                    <div class='activity_bar_text'></div>
                </div>`)

                let text_el = h.find(".activity_bar_text").eq(0)
                let img_el = h.find(".activity_bar_image").eq(0)

                img_el.on("error", function()
                {
                    if($(this).attr("src") !== Hue.config.default_profile_image_url)
                    {
                        $(this).attr("src", Hue.config.default_profile_image_url)
                    }
                })

                text_el.text(user.username)

                h.data("username", user.username)
                h.attr("title", item.username)

                c.append(h)
            }
        }
    }
}

// Pushes a user to the activity list and updates the activity bar
Hue.push_to_activity_bar = function(uname, date)
{
    let user = Hue.get_user_by_username(uname)

    if(!user || !Hue.check_permission(user.role, "chat"))
    {
        return false
    }

    let d = Date.now() - Hue.config.max_activity_bar_delay

    if(date < d)
    {
        return false
    }

    if(Hue.user_is_ignored(uname))
    {
        return false
    }

    for(let i=0; i<Hue.activity_list.length; i++)
    {
        if(Hue.activity_list[i].username === uname)
        {
            Hue.activity_list.splice(i, 1)
            break
        }
    }

    Hue.activity_list.unshift({username:uname, date:date})

    if(Hue.activity_list.length > Hue.config.max_activity_bar_items)
    {
        Hue.activity_list.pop()
    }

    Hue.check_activity_bar(false)

    if(Hue.started)
    {
        Hue.update_activity_bar()
    }
}

// Gets an activity bar item by username
Hue.get_activity_bar_item_by_username = function(username)
{
    let item = false

    $(".activity_bar_item").each(function()
    {
        if($(this).data("username") === username)
        {
            item = this
            return false
        }
    })

    return item
}

// What to do when a user disconnects
Hue.userdisconnect = function(data)
{
    let type = data.disconnection_type

    if(type === "disconnection")
    {
        Hue.start_user_disconnect_timeout(data)
    }

    else
    {
        Hue.do_userdisconnect(data)
    }
}

// Clears the disconnect timeout for a certain user
Hue.clear_from_users_to_disconnect = function(data)
{
    for(let i=0; i<Hue.users_to_disconnect.length; i++)
    {
        let u = Hue.users_to_disconnect[i]

        if(u.user_id === data.user_id)
        {
            clearTimeout(u.timeout)
            Hue.users_to_disconnect.splice(i, 1)
            break
        }
    }
}

// Starts a disconnect timeout for a certain user
Hue.start_user_disconnect_timeout = function(data)
{
    Hue.clear_from_users_to_disconnect(data)

    data.timeout = setTimeout(function()
    {
        Hue.do_userdisconnect(data)
    }, Hue.config.disconnect_timeout_delay)

    Hue.users_to_disconnect.push(data)
}

// After a disconnect timeout triggers this function is called
Hue.do_userdisconnect = function(data)
{
    Hue.clear_from_users_to_disconnect(data)
    Hue.remove_from_userlist(data.user_id)
    Hue.update_activity_bar()

    if(Hue.get_setting("show_parts") && Hue.check_permission(data.role, "chat"))
    {
        let type = data.disconnection_type
        let s

        if(type === "disconnection")
        {
            s = `${data.username} has left`
        }

        else if(type === "pinged")
        {
            s = `${data.username} has left (Ping Timeout)`
        }

        else if(type === "kicked")
        {
            s = `${data.username} was kicked by ${data.info1}`
        }

        else if(type === "banned")
        {
            s = `${data.username} was banned by ${data.info1}`

            if(Hue.ban_list_open)
            {
                Hue.request_ban_list()
            }
        }

        Hue.public_feedback(s,
        {
            brk: "<i class='icon2c fa fa-sign-out'></i>",
            save: true,
            username: data.username
        })
    }
}

// Announces that the operation cannot be applied to a certain user
// This is usually because the user's role is not low enough
Hue.forbidden_user = function()
{
    Hue.feedback("That operation is forbidden on that user")
}

// Announces username changes
Hue.announce_new_username = function(data)
{
    Hue.replace_uname_in_userlist(data.old_username, data.username)

    let show = Hue.check_permission(Hue.get_role(data.username), "chat")

    if(Hue.username === data.old_username)
    {
        Hue.set_username(data.username)

        if(show)
        {
            Hue.public_feedback(`${data.old_username} is now known as ${Hue.username}`,
            {
                username: data.username,
                open_profile: true
            })
        }

        else
        {
            Hue.feedback(`You are now known as ${Hue.username}`,
            {
                username: data.username,
                open_profile: true
            })
        }
    }

    else
    {
        if(show)
        {
            Hue.public_feedback(`${data.old_username} is now known as ${data.username}`,
            {
                username: data.username,
                open_profile: true
            })
        }
    }

    if(Hue.admin_list_open)
    {
        Hue.request_admin_list()
    }
}

// Check whether a user is ignored by checking the ignored usernames list
Hue.user_is_ignored = function(uname)
{
    if(uname === Hue.username)
    {
        return false
    }

    if(Hue.ignored_usernames_list.includes(uname))
    {
        return true
    }

    return false
}

// Returns feedback on wether a user is in the room or not
Hue.user_not_in_room = function(uname)
{
    if(uname)
    {
        Hue.feedback(`${uname} is not in the room`)
    }

    else
    {
        Hue.feedback("User is not in the room")
    }
}

// Returns a list of usernames matched by a string
// It splits and joins the string until a user in the user list matches
// Or returns an empty array
Hue.get_matching_usernames = function(s)
{
    let user = Hue.get_user_by_username(s)

    if(user)
    {
        return [user.username]
    }

    let split = s.split(" ")
    let uname = split[0]
    let matches = []

    for(let i=0; i<split.length; i++)
    {
        if(i > 0)
        {
            uname = `${uname} ${split[i]}`
        }

        if(Hue.usernames.includes(uname))
        {
            matches.push(uname)
        }
    }

    return matches
}

// Setups the profile image
Hue.setup_profile_image = function(pi)
{
    if(pi === "")
    {
        Hue.profile_image = Hue.config.default_profile_image_url
    }

    else
    {
        Hue.profile_image = pi
    }
}

// Setups user profile windows
Hue.setup_show_profile = function()
{
    $("#show_profile_whisper").click(function()
    {
        Hue.write_popup_message([$("#show_profile_uname").text()])
    })
}

// Shows a user's profile window
Hue.show_profile = function(uname, prof_image)
{
    let pi
    let role = "Offline"
    let user = Hue.get_user_by_username(uname)

    if(user)
    {
        role = Hue.get_pretty_role_name(user.role)
    }

    if(prof_image === "" || prof_image === undefined || prof_image === "undefined")
    {
        if(user && user.profile_image)
        {
            pi = user.profile_image
        }

        else
        {
            pi = Hue.config.default_profile_image_url
        }
    }

    else
    {
        pi = prof_image
    }

    $("#show_profile_uname").text(uname)
    $("#show_profile_role").text(`(${role})`)

    $("#show_profile_image").on("error", function()
    {
        if($(this).attr("src") !== Hue.config.default_profile_image_url)
        {
            $(this).attr("src", Hue.config.default_profile_image_url)
        }
    })

    $("#show_profile_image").attr("src", pi)

    if(!Hue.can_chat || !Hue.usernames.includes(uname))
    {
        $("#show_profile_whisper").css("display", "none")
    }

    else
    {
        $("#show_profile_whisper").css("display", "block")
    }

    if($('.show_profile_button').filter(function() {return $(this).css('display') !== 'none'}).length)
    {
        $("#show_profile_buttons").css("display", "flex")
    }

    else
    {
        $("#show_profile_buttons").css("display", "none")
    }

    Hue.msg_profile.show()
}

// Announces a user's profile image change
Hue.profile_image_changed = function(data)
{
    if(data.username === Hue.username)
    {
        Hue.profile_image = data.profile_image
        $("#user_menu_profile_image").attr("src", Hue.profile_image)
    }

    Hue.update_user_profile_image(data.username, data.profile_image)

    if(!Hue.user_is_ignored(data.username))
    {
        Hue.public_feedback(`${data.username} changed the profile image`,
        {
            username: data.username,
            open_profile: true
        })
    }
}

// Resets all voiced users to voice1
Hue.reset_voices = function()
{
    if(!Hue.is_admin_or_op(Hue.role))
    {
        Hue.not_an_op()
        return false
    }

    Hue.socket_emit('reset_voices', {})
}

// Resets all op users to voice1
Hue.remove_ops = function()
{
    if(Hue.role !== 'admin')
    {
        Hue.feedback("You are not a room admin")
        return false
    }

    Hue.socket_emit('remove_ops', {})
}

// Announces that voices were resetted
Hue.announce_voices_resetted = function(data)
{
    Hue.public_feedback(`${data.username} resetted the voices`,
    {
        username: data.username,
        open_profile: true
    })

    if(Hue.role.startsWith('voice') && Hue.role !== "voice1")
    {
        Hue.set_role("voice1")
    }

    Hue.reset_voices_userlist()
}

// Announces that ops were resetted
Hue.announce_removedops = function(data)
{
    Hue.public_feedback(`${data.username} removed all ops`,
    {
        username: data.username,
        open_profile: true
    })

    if(Hue.role === 'op')
    {
        Hue.set_role("voice1")
    }

    Hue.remove_ops_userlist()

    if(Hue.admin_list_open)
    {
        Hue.request_admin_list()
    }
}

// Changes a user's role
Hue.change_role = function(uname, rol)
{
    if(Hue.is_admin_or_op())
    {
        if(uname.length > 0 && uname.length <= Hue.config.max_max_username_length)
        {
            if(uname === Hue.username)
            {
                Hue.feedback("You can't assign a role to yourself")
                return false
            }

            if((rol === 'admin' || rol === 'op') && Hue.role !== 'admin')
            {
                Hue.forbidden_user()
                return false
            }

            if(!Hue.roles.includes(rol))
            {
                Hue.feedback("Invalid role")
                return false
            }

            Hue.socket_emit('change_role', {username:uname, role:rol})
        }
    }

    else
    {
        Hue.not_an_op()
    }
}

// Announces a user's role change
Hue.announce_role_change = function(data)
{
    if(Hue.username === data.username2)
    {
        Hue.set_role(data.role)
    }

    Hue.public_feedback(`${data.username1} gave ${data.role} to ${data.username2}`,
    {
        username: data.username1,
        open_profile: true
    })

    Hue.replace_role_in_userlist(data.username2, data.role)

    if(Hue.admin_list_open)
    {
        Hue.request_admin_list()
    }
}

// Role setter for user
Hue.set_role = function(rol, config=true)
{
    Hue.role = rol

    Hue.check_permissions()

    if(config)
    {
        Hue.config_main_menu()
    }
}

// Bans a user
Hue.ban = function(uname)
{
    if(Hue.is_admin_or_op())
    {
        if(uname.length > 0 && uname.length <= Hue.config.max_max_username_length)
        {
            if(uname === Hue.username)
            {
                Hue.feedback("You can't ban yourself")
                return false
            }

            Hue.socket_emit('ban', {username:uname})
        }
    }

    else
    {
        Hue.not_an_op()
    }
}

// Unbans a user
Hue.unban = function(uname)
{
    if(Hue.is_admin_or_op())
    {
        if(uname.length > 0 && uname.length <= Hue.config.max_max_username_length)
        {
            if(uname === Hue.username)
            {
                Hue.feedback("You can't unban yourself")
                return false
            }

            Hue.socket_emit('unban', {username:uname})
        }
    }

    else
    {
        Hue.not_an_op()
    }
}

// Unbans all banned users
Hue.unban_all = function()
{
    if(Hue.is_admin_or_op())
    {
        Hue.socket_emit('unban_all', {})
    }

    else
    {
        Hue.not_an_op()
    }
}

// Gets the number of users banned
Hue.get_ban_count = function()
{
    if(Hue.is_admin_or_op())
    {
        Hue.socket_emit('get_ban_count', {})
    }
}

// Shows a window with the number of users banned
Hue.receive_ban_count = function(data)
{
    let s

    if(data.count === 1)
    {
        s = `There is ${data.count} user banned`
    }

    else
    {
        s = `There are ${data.count} users banned`
    }

    Hue.msg_info.show(s)
}

// Kicks a user
Hue.kick = function(uname)
{
    if(Hue.is_admin_or_op())
    {
        if(uname.length > 0 && uname.length <= Hue.config.max_max_username_length)
        {
            if(uname === Hue.username)
            {
                Hue.feedback("You can't kick yourself")
                return false
            }

            if(!Hue.usernames.includes(uname))
            {
                Hue.user_not_in_room()
                return false
            }

            let rol = Hue.get_role(uname)

            if((rol === 'admin' || rol === 'op') && Hue.role !== 'admin')
            {
                Hue.forbidden_user()
                return false
            }

            Hue.socket_emit('kick', {username:uname})
        }
    }

    else
    {
        Hue.not_an_op()
    }
}

// Announces that a user was banned
Hue.announce_ban = function(data)
{
    Hue.public_feedback(`${data.username1} banned ${data.username2}`,
    {
        username: data.username1,
        open_profile: true
    })

    if(Hue.ban_list_open)
    {
        Hue.request_ban_list()
    }
}

// Announces that a user was unbanned
Hue.announce_unban = function(data)
{
    Hue.public_feedback(`${data.username1} unbanned ${data.username2}`,
    {
        username: data.username1,
        open_profile: true
    })

    if(Hue.ban_list_open)
    {
        Hue.request_ban_list()
    }
}

// Announces that all banned users were unbanned
Hue.announce_unban_all = function(data)
{
    Hue.public_feedback(`${data.username} unbanned all banned users`,
    {
        username: data.username,
        open_profile: true
    })
}

// Checks if a user already has a certain role
Hue.is_already = function(who, what)
{
    if(what === 'voice1')
    {
        Hue.feedback(`${who} already has voice 1`)
    }

    else if(what === 'voice2')
    {
        Hue.feedback(`${who} already has voice 2`)
    }

    else if(what === 'voice3')
    {
        Hue.feedback(`${who} already has voice 3`)
    }

    else if(what === 'voice4')
    {
        Hue.feedback(`${who} already has voice 4`)
    }

    else if(what === 'op')
    {
        Hue.feedback(`${who} is already an op`)
    }

    else if(what === 'admin')
    {
        Hue.feedback(`${who} is already an admin`)
    }
}

// Starts click events for 'generic usernames'
// Username elements with this class get included
Hue.start_generic_uname_click_events = function()
{
    $("body").on("click", ".generic_uname", function()
    {
        let uname = $(this).text()
        Hue.show_profile(uname)
    })
}

// Checks if a role is that of an admin or an operator
// Without arguments it checks the user's role
Hue.is_admin_or_op = function(rol=false)
{
    let r

    if(rol)
    {
        r = rol
    }

    else
    {
        r = Hue.role
    }

    if(r === "admin" || r === "op")
    {
        return true
    }

    else
    {
        return false
    }
}

// Superuser command to change to any role
Hue.annex = function(rol="admin")
{
    if(!Hue.roles.includes(rol))
    {
        Hue.feedback("Invalid role")
        return false
    }

    Hue.socket_emit('change_role', {username:Hue.username, role:rol})
}