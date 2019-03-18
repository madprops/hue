// Create all the Handlebars templates
Hue.setup_templates = function()
{
    $(".template").each(function()
    {
        let id = $(this).attr("id")
        Hue[id] = Handlebars.compile($(`#${id}`).html())
    })
}

// Starts and configures all Msg modal instances
Hue.start_msg = function()
{
    let common =
    {
        show_effect_duration: [200, 200],
        close_effect_duration: [200, 200],
        clear_editables: true,
        class: "modal",
        after_create: function(instance)
        {
            Hue.after_modal_create(instance)
        },
        before_show: function(instance)
        {
            if(Hue.room_state.screen_locked)
            {
                if(instance.options.id !== "lockscreen")
                return false
            }
        },
        after_show: function(instance)
        {
            Hue.after_modal_show(instance)
            Hue.after_modal_set_or_show(instance)
        },
        after_set: function(instance)
        {
            Hue.after_modal_set_or_show(instance)
        },
        after_close: function(instance)
        {
            Hue.after_modal_close(instance)
        }
    }

    if(Hue.get_setting("modal_effects"))
    {
        common.show_effect = "fade"
        common.close_effect = "fade"
    }

    else
    {
        common.show_effect = "none"
        common.close_effect = "none"
    }

    let titlebar =
    {
        enable_titlebar: true,
        center_titlebar: true,
        titlebar_class: "!custom_titlebar !unselectable",
        window_inner_x_class: "!titlebar_inner_x"
    }

    Hue.msg_main_menu = Msg.factory
    (
        Object.assign({}, common, titlebar,
        {
            id: "main_menu",
            window_width: "22em",
            after_close: function(instance)
            {
                common.after_close(instance)
                Hue.close_togglers("main_menu")
            }
        })
    )

    Hue.msg_user_menu = Msg.factory
    (
        Object.assign({}, common, titlebar,
        {
            id: "user_menu",
            clear_editables: false,
            window_width: "22em",
            after_close: function(instance)
            {
                common.after_close(instance)
                Hue.close_togglers("user_menu")
            }
        })
    )

    Hue.msg_userlist = Msg.factory
    (
        Object.assign({}, common, titlebar,
        {
            id: "userlist",
            window_width: "22em"
        })
    )

    Hue.msg_public_roomlist = Msg.factory
    (
        Object.assign({}, common, titlebar,
        {
            id: "public_roomlist",
            window_width: "26em"
        })
    )

    Hue.msg_visited_roomlist = Msg.factory
    (
        Object.assign({}, common, titlebar,
        {
            id: "visited_roomlist",
            window_width: "26em"
        })
    )

    Hue.msg_played = Msg.factory
    (
        Object.assign({}, common, titlebar,
        {
            id: "played",
            window_width: "26em"
        })
    )

    Hue.msg_modal_image = Msg.factory
    (
        Object.assign({}, common,
        {
            id: "modal_image",
            preset: "window",
            overlay_class: "!overlay_same_color",
            after_show: function(instance)
            {
                common.after_show(instance)
                Hue.modal_image_open = true
            },
            after_close: function(instance)
            {
                common.after_close(instance)
                Hue.clear_modal_image_info()
                Hue.msg_modal_image_number.close()
                Hue.modal_image_open = false
            }
        })
    )

    Hue.msg_modal_image_number = Msg.factory
    (
        Object.assign({}, common,
        {
            id: "modal_image_number",
            after_show: function(instance)
            {
                common.after_show(instance)
                Hue.modal_image_number_open = true
            },
            after_close: function(instance)
            {
                common.after_close(instance)
                Hue.modal_image_number_open = false
            }
        })
    )

    Hue.msg_lockscreen = Msg.factory
    (
        Object.assign({}, common,
        {
            id: "lockscreen",
            preset: "window",
            overlay_class: "!overlay_same_color"
        })
    )

    Hue.msg_profile = Msg.factory
    (
        Object.assign({}, common,
        {
            id: "profile",
            window_width: "22em",
            after_close: function(instance)
            {
                common.after_close(instance)
                $("#show_profile_uname").text("Loading")
                $("#show_profile_image").attr("src", Hue.config.profile_image_loading_url)
            }
        })
    )

    Hue.msg_info = Msg.factory
    (
        Object.assign({}, common,
        {
            id: "info",
            window_height: "auto",
            before_show: function(instance)
            {
                common.before_show(instance)
                Hue.info_vars_to_false()
            },
            after_close: function(instance)
            {
                common.after_close(instance)
                instance.content.innerHTML = ""
                Hue.info_vars_to_false()
            }
        })
    )

    Hue.msg_info2 = Msg.factory
    (
        Object.assign({}, common, titlebar,
        {
            id: "info2",
            window_height: "auto",
            before_show: function(instance)
            {
                common.before_show(instance)
                Hue.info2_vars_to_false()
            },
            after_close: function(instance)
            {
                common.after_close(instance)
                instance.content.innerHTML = ""
                instance.titlebar.innerHTML = ""
                Hue.info2_vars_to_false()
            }
        })
    )

    Hue.msg_image_picker = Msg.factory
    (
        Object.assign({}, common,
        {
            id: "image_picker",
            after_show: function(instance)
            {
                common.after_show(instance)
                Hue.image_picker_open = true
            },
            after_close: function(instance)
            {
                common.after_close(instance)
                $("#image_source_picker_input").val("")
                $("#image_source_picker_input_comment").val("")
                Hue.image_picker_open = false
            }
        })
    )

    Hue.msg_tv_picker = Msg.factory
    (
        Object.assign({}, common,
        {
            id: "tv_picker",
            after_show: function(instance)
            {
                common.after_show(instance)
                Hue.tv_picker_open = true
            },
            after_close: function(instance)
            {
                common.after_close(instance)
                $("#tv_source_picker_input").val("")
                $("#tv_source_picker_input_comment").val("")
                Hue.tv_picker_open = false
            }
        })
    )

    Hue.msg_radio_picker = Msg.factory
    (
        Object.assign({}, common,
        {
            id: "radio_picker",
            after_show: function(instance)
            {
                common.after_show(instance)
                Hue.radio_picker_open = true
            },
            after_close: function(instance)
            {
                common.after_close(instance)
                $("#radio_source_picker_input").val("")
                $("#radio_source_picker_input_comment").val("")
                Hue.radio_picker_open = false
            }
        })
    )

    Hue.msg_media_menu = Msg.factory
    (
        Object.assign({}, common, titlebar,
        {
            id: "media_menu",
            window_width: "22em",
            after_show: function(instance)
            {
                common.after_show(instance)
                Hue.media_menu_open = true
            },
            after_close: function(instance)
            {
                common.after_close(instance)
                Hue.media_menu_open = false
            }
        })
    )

    Hue.msg_message = Msg.factory
    (
        Object.assign({}, common, titlebar,
        {
            id: "message",
            window_width: "26em",
            close_on_overlay_click: false,
            after_show: function(instance)
            {
                common.after_show(instance)
                Hue.writing_message = true
            },
            after_close: function(instance)
            {
                common.after_close(instance)
                $("#write_message_area").val("")
                $("#write_message_feedback").text("")
                $("#write_message_feedback").css("display", "none")
                Hue.writing_message = false
                Hue.clear_draw_message_state()
            }
        })
    )

    Hue.msg_input_history = Msg.factory
    (
        Object.assign({}, common, titlebar,
        {
            id: "input_history",
            window_width: "24em"
        })
    )

    Hue.msg_chat_search = Msg.factory
    (
        Object.assign({}, common, titlebar,
        {
            id: "chat_search",
            window_width: "30em",
            after_close: function(instance)
            {
                common.after_close(instance)
                Hue.reset_chat_search_filter()
            }
        })
    )

    Hue.msg_highlights = Msg.factory
    (
        Object.assign({}, common, titlebar,
        {
            id: "highlights",
            window_width: "30em",
            after_close: function(instance)
            {
                common.after_close(instance)
                Hue.reset_highlights_filter()
            }
        })
    )

    Hue.msg_image_history = Msg.factory
    (
        Object.assign({}, common, titlebar,
        {
            id: "image_history",
            window_width: "24em",
            after_close: function(instance)
            {
                common.after_close(instance)
                Hue.reset_media_history_filter("image")
            }
        })
    )

    Hue.msg_tv_history = Msg.factory
    (
        Object.assign({}, common, titlebar,
        {
            id: "tv_history",
            window_width: "24em",
            after_close: function(instance)
            {
                common.after_close(instance)
                Hue.reset_media_history_filter("tv")
            }
        })
    )

    Hue.msg_radio_history = Msg.factory
    (
        Object.assign({}, common, titlebar,
        {
            id: "radio_history",
            window_width: "24em",
            after_close: function(instance)
            {
                common.after_close(instance)
                Hue.reset_media_history_filter("radio")
            }
        })
    )

    Hue.msg_locked = Msg.factory
    (
        Object.assign({}, common,
        {
            id: "locked",
            closeable: false,
            window_x: "none",
            show_effect: "none",
            close_effect: "none",
            enable_overlay: true,
            window_class: "!no_effects"
        })
    )

    Hue.msg_global_settings = Msg.factory
    (
        Object.assign({}, common, titlebar,
        {
            id: "global_settings",
            after_close: function(instance)
            {
                common.after_close(instance)
                Hue.close_togglers("global_settings")
            }
        })
    )

    Hue.msg_room_settings = Msg.factory
    (
        Object.assign({}, common, titlebar,
        {
            id: "room_settings",
            after_close: function(instance)
            {
                common.after_close(instance)
                Hue.close_togglers("room_settings")
            }
        })
    )

    Hue.msg_draw_image = Msg.factory
    (
        Object.assign({}, common, titlebar,
        {
            id: "draw_image",
            close_on_overlay_click: false,
            after_show: function(instance)
            {
                common.after_show(instance)
                Hue.draw_image_open = true
            },
            after_close: function(instance)
            {
                common.after_close(instance)
                Hue.draw_image_open = false
            }
        })
    )

    Hue.msg_credits = Msg.factory
    (
        Object.assign({}, common, titlebar,
        {
            id: "credits",
            after_close: function(instance)
            {
                common.after_close(instance)
                if(Hue.credits_audio)
                {
                    Hue.credits_audio.pause()
                }
            }
        })
    )

    Hue.msg_admin_activity = Msg.factory
    (
        Object.assign({}, common, titlebar,
        {
            id: "admin_activity"
        })
    )

    Hue.msg_access_log = Msg.factory
    (
        Object.assign({}, common, titlebar,
        {
            id: "access_log"
        })
    )

    Hue.msg_expand_image = Msg.factory
    (
        Object.assign({}, common,
        {
            id: "expand_image",
            preset: "window",
            overlay_class: "!overlay_same_color",
            after_close: function(instance)
            {
                common.after_close(instance)
                Hue.clear_modal_image_info()
            }
        })
    )

    Hue.msg_upload_comment = Msg.factory
    (
        Object.assign({}, common, titlebar,
        {
            id: "upload_comment",
            after_show: function(instance)
            {
                common.after_show(instance)
                Hue.upload_comment_open = true
            },
            after_close: function(instance)
            {
                common.after_close(instance)
                Hue.clear_modal_image_info()
                $("#upload_comment_input").val("")
                Hue.upload_comment_file = false
                Hue.upload_comment_type = false
                Hue.upload_comment_open = false
            }
        })
    )

    Hue.msg_reply = Msg.factory
    (
        Object.assign({}, common, titlebar,
        {
            id: "reply",
            window_width: "22em",
            after_show: function(instance)
            {
                common.after_show(instance)
                Hue.writing_reply = true
            },
            after_close: function(instance)
            {
                common.after_close(instance)
                Hue.clear_modal_image_info()
                Hue.writing_reply = false
            }
        })
    )

    Hue.msg_handle_url = Msg.factory
    (
        Object.assign({}, common, titlebar,
        {
            id: "handle_url",
            after_close: function(instance)
            {
                common.after_close(instance)
                Hue.clear_modal_image_info()
            }
        })
    )

    Hue.msg_open_url = Msg.factory
    (
        Object.assign({}, common, titlebar,
        {
            id: "open_url",
            after_close: function(instance)
            {
                common.after_close(instance)
                Hue.clear_modal_image_info()
            }
        })
    )

    Hue.msg_details = Msg.factory
    (
        Object.assign({}, common, titlebar,
        {
            id: "details",
            after_close: function(instance)
            {
                common.after_close(instance)
                Hue.clear_modal_image_info()
            }
        })
    )

    Hue.msg_main_menu.set(Hue.template_main_menu(
    {
        permissions_containers: Hue.make_main_menu_permissions_container()
    }))

    Hue.msg_user_menu.set(Hue.template_user_menu())
    Hue.msg_userlist.set(Hue.template_userlist())
    Hue.msg_public_roomlist.set(Hue.template_roomlist({type:"public_roomlist"}))
    Hue.msg_visited_roomlist.set(Hue.template_roomlist({type:"visited_roomlist"}))
    Hue.msg_played.set(Hue.template_played())
    Hue.msg_profile.set(Hue.template_profile({profile_image:Hue.config.profile_image_loading_url}))
    Hue.msg_image_picker.set(Hue.template_image_picker())
    Hue.msg_tv_picker.set(Hue.template_tv_picker())
    Hue.msg_radio_picker.set(Hue.template_radio_picker())
    Hue.msg_media_menu.set(Hue.template_media_menu())
    Hue.msg_message.set(Hue.template_message())
    Hue.msg_highlights.set(Hue.template_highlights())
    Hue.msg_image_history.set(Hue.template_image_history())
    Hue.msg_tv_history.set(Hue.template_tv_history())
    Hue.msg_radio_history.set(Hue.template_radio_history())
    Hue.msg_input_history.set(Hue.template_input_history())
    Hue.msg_chat_search.set(Hue.template_chat_search())
    Hue.msg_modal_image.set(Hue.template_modal_image())
    Hue.msg_modal_image_number.set(Hue.template_modal_image_number())
    Hue.msg_lockscreen.set(Hue.template_lockscreen())
    Hue.msg_locked.set(Hue.template_locked_menu())

    Hue.msg_global_settings.set(Hue.template_global_settings(
    {
        settings: Hue.template_settings(
        {
            type: "global_settings",
            user_functions: Hue.make_settings_user_functions("global_settings")
        })
    }))

    Hue.msg_room_settings.set(Hue.template_room_settings(
    {
        settings: Hue.template_settings(
        {
            type: "room_settings",
            user_functions: Hue.make_settings_user_functions("room_settings")
        })
    }))

    Hue.msg_draw_image.set(Hue.template_draw_image())
    Hue.msg_credits.set(Hue.template_credits({background_url:Hue.config.credits_background_url}))
    Hue.msg_admin_activity.set(Hue.template_admin_activity())
    Hue.msg_access_log.set(Hue.template_access_log())
    Hue.msg_expand_image.set(Hue.template_expand_image())
    Hue.msg_upload_comment.set(Hue.template_upload_comment())
    Hue.msg_reply.set(Hue.template_reply())
    Hue.msg_handle_url.set(Hue.template_handle_url())
    Hue.msg_open_url.set(Hue.template_open_url())
    Hue.msg_details.set(Hue.template_details())

    Hue.msg_info.create()
    Hue.msg_info2.create()

    Hue.msg_input_history.set_title("Input History")
    Hue.msg_highlights.set_title("<span id='highlights_window_title' class='pointer'>Highlights</span>")
    Hue.msg_chat_search.set_title("<span id='chat_search_window_title' class='pointer'>Chat Search</span>")
    Hue.msg_image_history.set_title("<span id='image_history_window_title' class='pointer'>Image History</span>")
    Hue.msg_tv_history.set_title("<span id='tv_history_window_title' class='pointer'>TV History</span>")
    Hue.msg_radio_history.set_title("<span id='radio_history_window_title' class='pointer'>Radio History</span>")
    Hue.msg_global_settings.set_title("<span id='global_settings_window_title' class='pointer'>Global Settings</span>")
    Hue.msg_room_settings.set_title("<span id='room_settings_window_title' class='pointer'>Room Settings</span>")
    Hue.msg_public_roomlist.set_title("<span id='public_rooms_window_title' class='pointer'>Public Rooms</span>")
    Hue.msg_visited_roomlist.set_title("<span id='visited_rooms_window_title' class='pointer'>Visited Rooms</span>")
    Hue.msg_played.set_title("Recently Played")
    Hue.msg_main_menu.set_title("<span id='main_menu_window_title' class='pointer'>Main Menu</span>")
    Hue.msg_user_menu.set_title("<span id='user_menu_window_title' class='pointer'>User Menu</span>")
    Hue.msg_media_menu.set_title("Media Menu")
    Hue.msg_draw_image.set_title("Draw an Image")
    Hue.msg_credits.set_title(Hue.config.credits_title)
    Hue.msg_admin_activity.set_title("Admin Activity")
    Hue.msg_access_log.set_title("Access Log")
    Hue.msg_upload_comment.set_title("Add a Comment")
    Hue.msg_reply.set_title("Write a Reply")
    Hue.msg_details.set_title("User Details")

    $("#global_settings_window_title").click(function()
    {
        Hue.toggle_settings_windows()
    })

    $("#room_settings_window_title").click(function()
    {
        Hue.toggle_settings_windows()
    })

    $("#public_rooms_window_title").click(function()
    {
        Hue.toggle_rooms_windows()
    })

    $("#visited_rooms_window_title").click(function()
    {
        Hue.toggle_rooms_windows()
    })

    $("#image_history_window_title").click(function()
    {
        Hue.toggle_media_history_windows()
    })

    $("#tv_history_window_title").click(function()
    {
        Hue.toggle_media_history_windows()
    })

    $("#radio_history_window_title").click(function()
    {
        Hue.toggle_media_history_windows()
    })

    $("#main_menu_window_title").click(function()
    {
        Hue.toggle_menu_windows()
    })

    $("#user_menu_window_title").click(function()
    {
        Hue.toggle_menu_windows()
    })

    $("#chat_search_window_title").click(function()
    {
        Hue.toggle_search_windows()
    })

    $("#highlights_window_title").click(function()
    {
        Hue.toggle_search_windows()
    })
}

// Sets all info window variables to false
Hue.info_vars_to_false = function()
{

}

// Sets all info window 2 variables to false
Hue.info2_vars_to_false = function()
{
    Hue.create_room_open = false
    Hue.import_settings_open = false
    Hue.goto_room_open = false
    Hue.open_room_open = false
    Hue.background_image_input_open = false
    Hue.admin_list_open = false
    Hue.ban_list_open = false
    Hue.change_user_username_open = false
    Hue.change_user_password_open = false
    Hue.change_user_email_open = false
}

// This is called after a modal is created
Hue.after_modal_create = function(instance)
{

}

// This is called after a modal is shown
Hue.after_modal_show = function(instance)
{
    Hue.active_modal = instance
    Hue.modal_open = true
    Hue.blur_input()
    Hue.focus_modal_filter(instance)
}

// Focuses the filter widget of a modal
Hue.focus_modal_filter = function(instance)
{
    let filter = $(`#Msg-content-${instance.options.id}`).find(".filter_input, .filter_input_2").eq(0)

    if(filter.length)
    {
        filter.focus()
    }
}

// Empties the filter of a modal and updates it
Hue.reset_modal_filter = function(instance)
{
    let id = instance.options.id
    let filter = $(`#Msg-content-${id} .filter_input`).eq(0)

    if(id === "info" || id === "info2" || filter.data("mode") === "manual")
    {
        return false
    }

    if(filter.length)
    {
        if(filter.val())
        {
            filter.val("")
            Hue.do_modal_filter(id)
        }
    }
}

// This is called after a modal is set or shown
Hue.after_modal_set_or_show = function(instance)
{
    setTimeout(function()
    {
        if(instance.options.id === "global_settings" || instance.options.id === "room_settings")
        {
            $(`#settings_window_${instance.options.id} .settings_window_category_container_selected`).get(0).scrollTop = 0
            $(`#settings_window_left_content_${instance.options.id}`).get(0).scrollTop = 0
        }

        else
        {
            instance.content_container.scrollTop = 0
        }
    }, 100)
}

// This is called after a modal is closed
Hue.after_modal_close = function(instance)
{
    if(!Hue.any_modal_open())
    {
        Hue.active_modal = false
        Hue.modal_open = false
        Hue.focus_input()
    }

    Hue.reset_modal_filter(instance)
}

// Gets all Msg modal instances
Hue.get_modal_instances = function()
{
    return Hue.msg_main_menu.higher_instances()
}

// Gets all Msg popup instances
Hue.get_popup_instances = function()
{
    return Hue.msg_main_menu.lower_instances()
}

// Gets all Msg instances
Hue.get_all_msg_instances = function()
{
    return Hue.msg_main_menu.instances()
}

// Checks if any Msg instance is open
Hue.any_msg_open = function()
{
    return Hue.msg_main_menu.any_open()
}

// Checks if any Msg modal instance is open
Hue.any_modal_open = function()
{
    return Hue.msg_main_menu.any_higher_open()
}

// Checks if any Msg popup instance is open
Hue.any_popup_open = function()
{
    return Hue.msg_main_menu.any_lower_open()
}

// Closes all Msg instances
Hue.close_all_msg = function(callback=false)
{
    if(callback)
    {
        Hue.msg_main_menu.close_all(callback)
    }

    else
    {
        Hue.msg_main_menu.close_all()
    }
}

// Closes all Msg modal instances
Hue.close_all_modals = function(callback=false)
{
    if(callback)
    {
        Hue.msg_main_menu.close_all_higher(callback)
    }

    else
    {
        Hue.msg_main_menu.close_all_higher()
    }
}

// Closes all Msg popup instances
Hue.close_all_popups = function(callback=false)
{
    if(callback)
    {
        Hue.msg_main_menu.close_all_lower(callback)
    }

    else
    {
        Hue.msg_main_menu.close_all_lower()
    }
}

// Starts custom filters events
Hue.start_filters = function()
{
    $("#chat_search_filter").on("input", function()
    {
        Hue.chat_search_timer()
    })

    $("#highlights_filter").on("input", function()
    {
        Hue.highlights_filter_timer()
    })

    $("#image_history_filter").on("input", function()
    {
        Hue.media_history_filter_timer("image")
    })

    $("#tv_history_filter").on("input", function()
    {
        Hue.media_history_filter_timer("tv")
    })

    $("#radio_history_filter").on("input", function()
    {
        Hue.media_history_filter_timer("radio")
    })

    $("#global_settings_filter").on("input", function()
    {
        Hue.settings_filter_timer("global_settings")
    })

    $("#room_settings_filter").on("input", function()
    {
        Hue.settings_filter_timer("room_settings")
    })

    $("#input_history_filter").on("input", function()
    {
        Hue.input_history_filter_timer()
    })
}

// Filter action for normal filter windows
Hue.do_modal_filter = function(id=false)
{
    if(!id)
    {
        if(!Hue.active_modal)
        {
            return false
        }

        id = Hue.active_modal.options.id
    }

    let filter = $(`#Msg-content-${id} .filter_input`).eq(0)

    if(!filter.length)
    {
        return false
    }

    let value = filter.val().trim()
    filter.val(value)

    let lc_value = Hue.utilz.clean_string2(value).toLowerCase()
    let items = $(`#Msg-content-${id} .modal_item`)
    let display = "block"

    if(lc_value)
    {
        let words = lc_value.split(" ")

        items.each(function()
        {
            let item_value = $(this).text().toLowerCase()

            if(words.some(word => item_value.includes(word)))
            {
                $(this).css("display", display)
            }

            else
            {
                $(this).css("display", "none")
            }
        })

        Hue[`${id}_filtered`] = true
    }

    else
    {
        items.each(function()
        {
            $(this).css("display", display)
        })

        Hue[`${id}_filtered`] = false
    }

    Hue.scroll_modal_to_top(id)
}

// Scrolls a modal window to the top
Hue.scroll_modal_to_top = function(id)
{
    $(`#Msg-content-container-${id}`).scrollTop(0)
}

// Scrolls a modal window to the bottom
Hue.scroll_modal_to_bottom = function(id)
{
    let container = $(`#Msg-content-container-${id}`)[0]
    container.scrollTop = container.scrollHeight
}

// Creates a Msg popup
Hue.create_popup = function(position, id=false, after_close=false)
{
    let common =
    {
        show_effect_duration: [0, 400],
        close_effect_duration: [400, 0],
        clear_editables: true,
        class: "popup"
    }

    if(id)
    {
        common.id = id
    }

    if(after_close)
    {
        common.after_close = after_close
    }

    if(Hue.get_setting("modal_effects"))
    {
        common.show_effect = "fade"
        common.close_effect = "fade"
    }

    else
    {
        common.show_effect = "none"
        common.close_effect = "none"
    }

    let edges_height = $("#footer").height()

    let pop = Msg.factory
    (
        Object.assign({}, common,
        {
            preset: "popup",
            edge_padding_y: edges_height + 20,
            position: position,
            window_class: "!custom_popup",
            enable_titlebar: true,
            center_titlebar: true,
            titlebar_class: "!custom_titlebar !unselectable",
            window_inner_x_class: "!titlebar_inner_x"
        })
    )

    z = pop

    return pop
}

// Function to apply the defined toggles between windows
Hue.process_window_toggle = function(data)
{
    let highest = Hue.msg_main_menu.highest_instance()
    let current = highest.options.id
    let next_func = data[current]

    if(!current || !next_func)
    {
        return false
    }

    Hue[`msg_${current}`].close(function()
    {
        next_func()
    })
}

// Changes the state of a toggler
// If enabled, it will show the container and show a -
// If disabled it will hide the container and show a +
Hue.set_toggler = function(type, el, action=false)
{
    let container = $(el).next(`.${type}_toggle_container`)
    let display = container.css('display')

    if(display === "none")
    {
        if(action && action !== "open")
        {
            return false
        }

        Hue.close_togglers(type)
        container.css("display", "block")
        $(el).html(`- ${$(el).html().trim().substring(2)}`)
        container.closest(".toggler_main_container")[0].scrollIntoView({block:"center"})
    }

    else
    {
        if(action && action !== "close")
        {
            return false
        }

        container.css("display", "none")
        $(el).html(`+ ${$(el).html().trim().substring(2)}`)
    }
}

// Setups toggler events
// Togglers are elements that when clicked reveal more elements
// They can be toggled
Hue.setup_togglers = function(type)
{
    $(`.${type}_toggle`).each(function()
    {
        $(this).click(function()
        {
            Hue.set_toggler(type, this)
        })
    })
}

// Opens a toggler
Hue.open_togglers = function(type)
{
    $(`.${type}_toggle`).each(function()
    {
        Hue.set_toggler(type, this, "open")
    })
}

// Closes a toggler
Hue.close_togglers = function(type)
{
    $(`.${type}_toggle`).each(function()
    {
        Hue.set_toggler(type, this, "close")
    })
}

// Determines what to do after a 'close all modals' trigger
// If it comes from a modal it closes all modals
// If it comes from a popup it closes all popups
Hue.process_msg_close_button = function(button)
{
    let container = $(button).closest(".Msg-container")

    if(container.hasClass("Msg-container-modal"))
    {
        Hue.close_all_modals()
    }

    else if(container.hasClass("Msg-container-popup"))
    {
        Hue.close_all_popups()
    }
}