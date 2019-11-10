// Setups an image object
// This handles image objects received live from the server or from logged messages
// This is the entry function for image objects to get registered, announced, and be ready for use
Hue.setup_image = function(mode, odata={})
{
    let data = {}

    data.id = odata.id
    data.user_id = odata.user_id
    data.type = odata.type
    data.source = odata.source
    data.setter = odata.setter
    data.size = odata.size
    data.date = odata.date
    data.query = odata.query
    data.comment = odata.comment
    data.in_log = odata.in_log === undefined ? true : odata.in_log

    data.nice_date = data.date ? Hue.utilz.nice_date(data.date) : Hue.utilz.nice_date()

    if(!data.setter)
    {
        data.setter = Hue.config.system_username
    }

    if(!data.source)
    {
        data.source = Hue.config.default_image_source
    }

    if(data.source.startsWith("/"))
    {
        data.source = window.location.origin + data.source
    }

    else if(data.source.startsWith(window.location.origin))
    {
        if(!data.size)
        {
            for(let img of Hue.image_changed)
            {
                if(img.source === data.source)
                {
                    data.type = img.type
                    data.size = img.size
                    break
                }
            }
        }
    }

    if(!data.date)
    {
        data.date = Date.now()
    }

    let gets = data.id ? `${data.id.slice(-3)} | ` : ""

    data.info = `${gets}Setter: ${data.setter} | ${data.nice_date}`
    data.info_html = `<div>Setter: ${Hue.utilz.make_html_safe(data.setter)}</div><div>${data.nice_date}</div>`

    if(data.type === "upload")
    {
        data.info += ` | Size: ${Hue.utilz.get_size_string(data.size)}`
        data.info_html += `<div>Size: ${Hue.utilz.get_size_string(data.size)}</div>`
    }

    if(data.query)
    {
        data.info += ` | Search Term: "${data.query}"`
        data.info_html += `<div>Search Term: "${Hue.utilz.make_html_safe(data.query)}"</div>`
    }

    data.message = `${data.setter} changed the image`

    data.onclick = function()
    {
        Hue.show_modal_image(data)
    }

    if(data.message)
    {
        data.message_id = Hue.announce_image(data).message_id
    }

    if(!data.setter)
    {
        data.info = "Default Image"
    }

    if(mode === "change" || mode === "show")
    {
        Hue.push_image_changed(data)
        Hue.set_modal_image_number()
    }

    if(mode === "change")
    {
        if(Hue.room_state.image_locked)
        {
            $("#footer_lock_image_icon").addClass("blinking")
        }

        Hue.change({type:"image"})
    }
}

// Announces an image change to the chat
Hue.announce_image = function(data)
{
    return Hue.public_feedback(data.message,
    {
        id: data.id,
        save: true,
        brk: "<i class='icon2c fa fa-camera'></i>",
        date: data.date,
        username: data.setter,
        title: data.info,
        onclick: data.onclick,
        comment: data.comment,
        type: "image_change",
        user_id: data.user_id,
        in_log: data.in_log
    })
}

// Pushes a changed image into the image changed array
Hue.push_image_changed = function(data)
{
    Hue.image_changed.push(data)

    if(Hue.image_changed.length > Hue.config.media_changed_crop_limit)
    {
        Hue.image_changed = Hue.image_changed.slice(Hue.image_changed.length - Hue.config.media_changed_crop_limit)
    }

    Hue.after_push_media_change("image", data)
}

// Returns the current room image
// The last image in the image changed array
// This is not necesarily the user's loaded image
Hue.current_image = function()
{
    if(Hue.image_changed.length > 0)
    {
        return Hue.image_changed[Hue.image_changed.length - 1]
    }

    else
    {
        return {}
    }
}

// Loads an image with a specified item
Hue.show_image = function(force=false)
{
    let item = Hue.loaded_image

    $("#media_image_frame").attr("crossOrigin", "anonymous")
    $("#media_image_error").css("display", "none")
    $("#media_image_frame").css("display", "initial")

    if(force || $("#media_image_frame").attr("src") !== item.source)
    {
        $("#media_image_frame").attr("src", item.source)
    }

    else
    {
        Hue.after_image_load()
    }
}

// Attempts to change the image source
// It considers room state and permissions
// It considers text or url to determine if it's valid
// It includes a 'just check' flag to only return true or false
Hue.change_image_source = function(src, just_check=false, comment="")
{
    let feedback = true

    if(just_check)
    {
        feedback = false
    }

    if(!Hue.can_image)
    {
        if(feedback)
        {
            Hue.feedback("You don't have permission to change the image")
        }

        return false
    }

    if(!comment)
    {
        let r = Hue.get_media_change_inline_comment("image", src)
        src = r.source
        comment = r.comment
    }

    if(comment.length > Hue.config.max_media_comment_length)
    {
        if(feedback)
        {
            Hue.feedback("Comment is too long")
        }

        return false
    }

    if(src.length === 0)
    {
        return false
    }

    src = Hue.utilz.clean_string2(src)

    if(src.length > Hue.config.max_media_source_length)
    {
        return false
    }

    if(src.startsWith("/"))
    {
        return false
    }

    if(src === Hue.current_image().source || src === Hue.current_image().query)
    {
        if(feedback)
        {
            Hue.feedback("Image is already set to that")
        }

        return false
    }

    else if(src === "default")
    {
        // OK
    }

    else if(src === "prev" || src === "previous")
    {
        if(Hue.image_changed.length > 1)
        {
            src = Hue.image_changed[Hue.image_changed.length - 2].source
        }

        else
        {
            if(feedback)
            {
                Hue.feedback("No image source before current one")
            }

            return false
        }
    }

    else if(Hue.utilz.is_url(src))
    {
        src = src.replace(/\.gifv/g, '.gif')

        if(Hue.check_domain_list("image", src))
        {
            if(feedback)
            {
                Hue.feedback("Image sources from that domain are not allowed")
            }

            return false
        }

        let extension = Hue.utilz.get_extension(src).toLowerCase()

        if(!extension || !Hue.utilz.image_extensions.includes(extension))
        {
            if(feedback)
            {
                Hue.feedback("That doesn't seem to be an image")
            }

            return false
        }
    }

    else
    {
        if(src.length > Hue.config.safe_limit_1)
        {
            if(feedback)
            {
                Hue.feedback("Query is too long")
            }

            return false
        }

        if(!Hue.config.imgur_enabled)
        {
            if(feedback)
            {
                Hue.feedback("Imgur support is not enabled")
            }

            return false
        }
    }

    if(just_check)
    {
        return true
    }

    Hue.emit_change_image_source(src, comment)
}

// Sends an emit to change the image source
Hue.emit_change_image_source = function(url, comment="")
{
    if(!Hue.can_image)
    {
        Hue.feedback("You don't have permission to change the image")
        return false
    }

    if(Hue.get_setting('confirm_image'))
    {
        if(!confirm('Are you sure you want to change the image here?'))
        {
            return
        }
    }

    Hue.socket_emit('change_image_source', {src:url, comment:comment})
}

// Sends an emit to change the image to the previous one
Hue.image_prev = function()
{
    Hue.change_image_source("prev")
    Hue.msg_image_picker.close()
}

// Updates dimensions of the image
Hue.fix_image_frame = function()
{
    if(!Hue.image_visible)
    {
        return false
    }

    if(!$("#media_image_frame")[0].naturalHeight)
    {
        return false
    }

    Hue.fix_frame("media_image_frame")
}

// Changes the image to visible or not visible
Hue.toggle_image = function(what=undefined, save=true)
{
    if(what !== undefined)
    {
        if(Hue.room_state.image_enabled !== what)
        {
            Hue.room_state.image_enabled = what
        }

        else
        {
            save = false
        }
    }

    else
    {
        Hue.room_state.image_enabled = !Hue.room_state.image_enabled
    }

    if(Hue.image_visible !== what)
    {
        Hue.change_image_visibility()
    }

    if(save)
    {
        Hue.save_room_state()
    }
}

// Changes the image visibility based on current state
Hue.change_image_visibility = function()
{
    if(Hue.room_image_mode !== "disabled" && Hue.room_state.image_enabled)
    {
        $("#media").css("display", "flex")
        $("#media_image").css("display", "flex")
        $("#footer_toggle_image_icon").removeClass("fa-toggle-off")
        $("#footer_toggle_image_icon").addClass("fa-toggle-on")

        if(Hue.first_media_change)
        {
            Hue.change({type:"image"})
        }

        Hue.image_visible = true
        Hue.fix_image_frame()
    }

    else
    {
        $("#media_image").css("display", "none")

        let num_visible = Hue.num_media_elements_visible()

        if(num_visible === 0)
        {
            Hue.hide_media()
        }

        $("#footer_toggle_image_icon").removeClass("fa-toggle-on")
        $("#footer_toggle_image_icon").addClass("fa-toggle-off")

        Hue.image_visible = false
    }

    if(Hue.tv_visible)
    {
        Hue.fix_visible_video_frame()
    }

    Hue.check_footer_media_rotate()
    Hue.goto_bottom(false, false)
}

// When clicking the Previous button in the image modal window
Hue.modal_image_prev_click = function()
{
    let index = Hue.image_changed.indexOf(Hue.loaded_modal_image) - 1

    if(index < 0)
    {
        index = Hue.image_changed.length - 1
    }

    let prev = Hue.image_changed[index]

    Hue.show_modal_image(prev)
}

// When clicking the Next button in the image modal window
Hue.modal_image_next_click = function(e)
{
    let index = Hue.image_changed.indexOf(Hue.loaded_modal_image) + 1

    if(index > Hue.image_changed.length - 1)
    {
        index = 0
    }

    let next = Hue.image_changed[index]

    Hue.show_modal_image(next)
}

// Setups image modal window events
Hue.setup_modal_image = function()
{
    let img = $("#modal_image")

    img[0].addEventListener('load', function()
    {
        $("#modal_image_spinner").css("display", "none")
        $("#modal_image").css("display", "block")
        Hue.show_modal_image_resolution()
    })

    img.on("error", function()
    {
        $("#modal_image_spinner").css("display", "none")
        $("#modal_image").css("display", "none")
        $("#modal_image_error").css("display", "block")
    })

    let f = function(e)
    {
        if(e.ctrlKey || e.shiftKey)
        {
            return false
        }

        let direction = e.deltaY > 0 ? 'down' : 'up'

        if(direction === 'up')
        {
            Hue.modal_image_next_wheel_timer()
        }

        else if(direction === 'down')
        {
            Hue.modal_image_prev_wheel_timer()
        }
    }

    $("#Msg-window-modal_image")[0].addEventListener("wheel", f)

    $("#modal_image_container").click(function()
    {
        Hue.msg_modal_image.close()
    })

    $("#modal_image_header_info").click(function()
    {
        Hue.show_media_history("image")
    })

    $("#modal_image_footer_info").click(function()
    {
        Hue.show_modal_image_number()
    })

    $("#modal_image_footer_prev").click(function(e)
    {
        Hue.modal_image_prev_click()
    })

    $("#modal_image_footer_next").click(function(e)
    {
        Hue.modal_image_next_click()
    })

    $("#modal_image_toolbar_load").click(function(e)
    {
        let item = Hue.loaded_modal_image
        Hue.toggle_image(true)
        Hue.change({type:"image", item:item, force:true})
        Hue.toggle_lock_image(true)
        Hue.close_all_modals()
    })

    $("#modal_image_toolbar_change").click(function(e)
    {
        if(confirm("This will change it for everyone. Are you sure?"))
        {
            let item = Hue.loaded_modal_image
            Hue.change_image_source(item.source)
            Hue.close_all_modals()
        }
    })
}

// Opens the image modal with the current image
Hue.show_current_image_modal = function(current=true)
{
    if(current)
    {
        Hue.show_modal_image(Hue.current_image_data)
    }

    else
    {
        if(Hue.image_changed.length > 0)
        {
            let data = Hue.image_changed[Hue.image_changed.length - 1]
            Hue.show_modal_image(data)
        }
    }
}

// Clears image information in the modal image window
Hue.clear_modal_image_info = function()
{
    $("#modal_image_header_info").html("")
    $("#modal_image_footer_info").html("")
}

// Shows the modal image window
Hue.show_modal_image = function(data)
{
    if(!data.source)
    {
        if(Hue.image_changed.length > 0)
        {
            Hue.show_current_image_modal(false)
            return false
        }

        else
        {
            Hue.msg_info.show("No image loaded yet")
            return false
        }
    }

    Hue.loaded_modal_image = data

    let img = $("#modal_image")

    img.css("display", "none")

    $("#modal_image_spinner").css("display", "block")
    $("#modal_image_error").css("display", "none")

    img.attr("src", data.source)

    $("#modal_image_header_info").html(data.info_html)

    Hue.horizontal_separator.separate("modal_image_header_info")

    if(data.comment)
    {
        $("#modal_image_subheader").html(Hue.replace_markdown(Hue.utilz.make_html_safe(data.comment)))
        $("#modal_image_subheader").css("display", "block")
        Hue.setup_whispers_click($("#modal_image_subheader"), data.setter)
    }

    else
    {
        $("#modal_image_subheader").css("display", "none")
    }

    if((Hue.room_image_mode === "enabled" || Hue.room_image_mode === "locked") && data !== Hue.loaded_image)
    {
        $("#modal_image_toolbar_load").css("display", "block")
    }

    else
    {
        $("#modal_image_toolbar_load").css("display", "none")
    }

    if(Hue.change_image_source(data.source, true))
    {
        $("#modal_image_toolbar_change").css("display", "flex")
    }

    else
    {
        $("#modal_image_toolbar_change").css("display", "none")
    }

    Hue.horizontal_separator.separate("modal_image_header_info_container")

    Hue.msg_modal_image.show(function()
    {
        Hue.set_modal_image_number()
    })
}

// Sets the image number in the modal image window
Hue.set_modal_image_number = function(id)
{
    if(!Hue.modal_image_open)
    {
        return false
    }

    let index = Hue.image_changed.indexOf(Hue.loaded_modal_image)
    let number = index + 1
    let footer_text = `${number} of ${Hue.image_changed.length}`
    $("#modal_image_footer_info").text(footer_text)

    if(number > 0)
    {
        $("#modal_image_number_input").val(number)
    }

    else
    {
        $("#modal_image_number_input").val(1)
    }
}

// Setups the image number widget in the modal image window
Hue.setup_modal_image_number = function()
{
    $("#modal_image_number_button").click(function()
    {
        Hue.modal_image_number_go()
    })

    $("#modal_image_number_input").on("input", function()
    {
        let val = parseInt($("#modal_image_number_input").val())

        if(val < 1)
        {
            $("#modal_image_number_input").val(Hue.image_changed.length)
        }

        else if(val === Hue.image_changed.length + 1)
        {
            $("#modal_image_number_input").val(1)
        }

        else if(val > Hue.image_changed.length)
        {
            $("#modal_image_number_input").val(Hue.image_changed.length)
        }
    })
}

// Shows the modal image widget
Hue.show_modal_image_number = function()
{
    Hue.msg_modal_image_number.show(function()
    {
        $("#modal_image_number_input").focus()
        $("#modal_image_number_input").select()
    })
}

// Goes to a specified image number in the modal image window
Hue.modal_image_number_go = function()
{
    let val = parseInt($("#modal_image_number_input").val())

    let ic = Hue.image_changed[val - 1]

    if(ic)
    {
        Hue.show_modal_image(ic)
        Hue.msg_modal_image_number.close()
    }
}

// Adds modal image resolution information to the modal image's information
// This is disaplayed in the modal image window
Hue.show_modal_image_resolution = function()
{
    let img = $("#modal_image")[0]
    let w = img.naturalWidth
    let h = img.naturalHeight

    if(img.src === Hue.loaded_modal_image.source)
    {
        $("#modal_image_header_info").html(Hue.loaded_modal_image.info_html + `<div>Resolution: ${w} x ${h}</div>`)
        Hue.horizontal_separator.separate("modal_image_header_info")
    }
}

// Starts events for the image
Hue.start_image_events = function()
{
    $('#media_image_frame')[0].addEventListener('load', function(e)
    {
        Hue.after_image_load()
    })

    $('#media_image_frame').on("error", function()
    {
        if($("#media_image_frame")[0].hasAttribute("crossOrigin"))
        {
            $("#media_image_frame").removeAttr("crossOrigin")
            $("#media_image_frame").attr("src", $("#media_image_frame").attr("src"))
        }

        else
        {
            $("#media_image_frame").css("display", "none")
            $("#media_image_info").css("display", "none")
            $("#media_image_error").css("display", "initial")
        }
    })

    $("#media_image_frame").height(0)
    $("#media_image_frame").width(0)
}

// This runs after an image successfully loads
Hue.after_image_load = function()
{
    Hue.current_image_data = Hue.loaded_image
    $("#media_image_info").css("display", "initial")
    Hue.apply_media_info($("#media_image_info")[0], Hue.loaded_image, "image")
    Hue.get_dominant_theme()
    Hue.fix_image_frame()
}

// Tries to get the dominant color of the image
Hue.get_dominant_theme = function()
{
    try
    {
        let color = Hue.colorlib.get_dominant($("#media_image_frame")[0], 1, true)[0]

        if(color)
        {
            Hue.dominant_theme = color

            if(Hue.theme_mode === "automatic")
            {
                Hue.apply_theme()
            }
        }

        else
        {
            Hue.dominant_theme = false
        }
    }

    catch(err)
    {
        Hue.dominant_theme = false
    }
}

// Checks if the image is maximized
Hue.image_is_maximized = function()
{
    return Hue.image_visible && !Hue.tv_visible
}

// Maximizes the image, hiding the tv
Hue.maximize_image = function()
{
    if(Hue.image_visible)
    {
        if(Hue.tv_visible)
        {
            Hue.toggle_tv(false, false)
        }

        else
        {
            Hue.toggle_tv(true, false)
        }
    }

    else
    {
        Hue.toggle_image(true, false)

        if(Hue.tv_visible)
        {
            Hue.toggle_tv(false, false)
        }
    }

    Hue.save_room_state()
}

// Setups image expansions when clicked
// When an image in the chat is clicked the image is shown full sized in a window
Hue.setup_expand_image = function()
{
    let img = $("#expand_image")

    img[0].addEventListener("load", function()
    {
        img.css("display", "block")
        $("#expand_image_spinner").css("display", "none")
    })

    img.on("error", function()
    {
        $("#expand_image_spinner").css("display", "none")
        $("#expand_image").css("display", "none")
        $("#expand_image_error").css("display", "block")
    })
}

// Shows a window with an image at full size
Hue.expand_image = function(src)
{
    $("#expand_image").css("display", "none")
    $("#expand_image_spinner").css("display", "block")
    $("#expand_image_error").css("display", "none")
    $("#expand_image").attr("src", src)
    Hue.msg_expand_image.show()
}

// Hides the expand image window
Hue.hide_expand_image = function()
{
    Hue.msg_expand_image.close()
}

// Enables or disables the image lock
Hue.toggle_lock_image = function(what=undefined, save=true)
{
    if(what !== undefined)
    {
        Hue.room_state.image_locked = what
    }

    else
    {
        Hue.room_state.image_locked = !Hue.room_state.image_locked
    }

    Hue.change_lock_image()

    if(save)
    {
        Hue.save_room_state()
    }
}

// Applies changes to the image footer lock icon
Hue.change_lock_image = function()
{
    Hue.change_media_lock("image")
}

// Reloads the image with the same source
Hue.refresh_image = function()
{
    Hue.change({type:"image", force:true, play:true, current_source:true})
}

// Used to change the image
// Shows the image picker window to input a URL, draw, or upload a file
Hue.show_image_picker = function()
{
    if(!Hue.can_image)
    {
        Hue.feedback("You don't have image permission")
        return false
    }

    Hue.msg_image_picker.show(function()
    {
        $("#image_source_picker_input").focus()
        Hue.scroll_modal_to_bottom("image_picker")
    })
}

// Room image mode setter
Hue.set_room_image_mode = function(what)
{
    Hue.room_image_mode = what
    Hue.config_admin_room_image_mode()
}

// Announces room image mode changes
Hue.announce_room_image_mode_change = function(data)
{
    Hue.show_room_notification(data.username, `${data.username} changed the image mode to ${data.what}`)
    Hue.set_room_image_mode(data.what)
    Hue.change_image_visibility()
    Hue.check_media_permissions()
    Hue.check_media_maxers()
}

// Shows the window to add a comment to an image upload
Hue.show_image_upload_comment = function(file, type)
{
    $("#image_upload_comment_image_feedback").css("display", "none")
    $("#image_upload_comment_image_preview").css("display", "inline-block")

    let reader = new FileReader()

    reader.onload = function(e)
    {
        Hue.image_upload_comment_file = file
        Hue.image_upload_comment_type = type

        $("#image_upload_comment_image_preview").attr("src", e.target.result)

        Hue.msg_image_upload_comment.set_title(`${Hue.utilz.slice_string_end(file.name, 20)} (${Hue.utilz.get_size_string(file.size, 2)})`)

        $("#Msg-titlebar-image_upload_comment").attr("title", file.name)

        Hue.msg_image_upload_comment.show(function()
        {
            $("#image_upload_comment_submit").click(function()
            {
                Hue.process_image_upload_comment()
            })

            $("#image_upload_comment_input").focus()
            Hue.scroll_modal_to_bottom("image_upload_comment")
        })
    }

    reader.readAsDataURL(file)
}

// Setups the upload image comment window
Hue.setup_image_upload_comment = function()
{
    let img = $("#image_upload_comment_image_preview")

    img.on("error", function()
    {
        $(this).css("display", "none")
        $("#image_upload_comment_image_feedback").css("display", "inline")
    })
}

// Submits the upload image comment window
// Uploads the file and the optional comment
Hue.process_image_upload_comment = function()
{
    if(!Hue.image_upload_comment_open)
    {
        return false
    }

    Hue.image_upload_comment_open = false
    
    let file = Hue.image_upload_comment_file
    let type = Hue.image_upload_comment_type
    let comment = Hue.utilz.clean_string2($("#image_upload_comment_input").val())
    
    if(comment.length > Hue.config.max_media_comment_length)
    {
        return false
    }
    
    Hue.upload_file({file:file, action:type, comment:comment})
    Hue.msg_image_upload_comment.close()
}

// Changes the room image mode
Hue.change_room_image_mode = function(what)
{
    if(!Hue.check_op_permission(Hue.role, "media"))
    {
        return false
    }

    let modes = ["enabled", "disabled", "locked"]

    if(!modes.includes(what))
    {
        Hue.feedback(`Valid image modes: ${modes.join(" ")}`)
        return false
    }

    if(what === Hue.room_image_mode)
    {
        Hue.feedback(`Image mode is already set to that`)
        return false
    }

    Hue.socket_emit("change_image_mode", {what:what})
}

Hue.setup_image_picker = function()
{
    $("#image_source_picker_input").on("input", function()
    {
        Hue.check_image_picker()
    })

    Hue.check_image_picker()
}

Hue.check_image_picker = function(el)
{
    if($("#image_source_picker_input").val().trim().length > 0)
    {
        $("#image_file_picker").css("display", "none")
        $("#image_picker_submit").css("display", "inline-block")
    }
    
    else
    {
        $("#image_file_picker").css("display", "inline-block")
        $("#image_picker_submit").css("display", "none")
    }
}

Hue.image_picker_submit = function()
{
    let val = $("#image_source_picker_input").val().trim()

    if(val !== "")
    {
        Hue.change_image_source(val)
        Hue.msg_image_picker.close()
    }
}