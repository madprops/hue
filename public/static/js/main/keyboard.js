// Setups most keyboard events
Hue.activate_key_detection = function()
{
    document.addEventListener('keydown', (e) =>
    {
        if(!Hue.started)
        {
            return
        }

        if(e.key === "Tab")
        {
            e.preventDefault()
        }

        if(!(Hue.utilz.is_textbox(document.activeElement)
        && document.activeElement.value.trim())
        && Hue.keys_pressed[e.keyCode] === undefined
        && !e.repeat)
        {
            Hue.keys_pressed[e.keyCode] = true

            if(Object.keys(Hue.keys_pressed).length === 1)
            {
                if(e.key === Hue.config.double_tap_key)
                {
                    Hue.double_tap_key_pressed += 1

                    if(Hue.double_tap_key_pressed === 2)
                    {
                        Hue.on_double_tap()
                    }

                    else
                    {
                        Hue.double_tap_timer()
                    }
                }

                else if(e.key === Hue.config.double_tap_key_2)
                {
                    Hue.double_tap_key_2_pressed += 1

                    if(Hue.double_tap_key_2_pressed === 2)
                    {
                        Hue.on_double_tap_2()
                    }

                    else
                    {
                        Hue.double_tap_2_timer()
                    }
                }

                else if(e.key === Hue.config.double_tap_key_3)
                {
                    Hue.double_tap_key_3_pressed += 1

                    if(Hue.double_tap_key_3_pressed === 2)
                    {
                        Hue.on_double_tap_3()
                    }

                    else
                    {
                        Hue.double_tap_3_timer()
                    }
                }

                else
                {
                    Hue.reset_double_tap_keys_pressed()
                }
            }

            else
            {
                Hue.reset_double_tap_keys_pressed()
            }
        }

        else
        {
            Hue.reset_double_tap_keys_pressed()
        }

        if(Hue.modal_open)
        {
            if(e.key === "Escape")
            {
                if(e.shiftKey)
                {
                    Hue.close_all_modals()
                    e.preventDefault()
                    return
                }
            }

            if(Hue.image_picker_open)
            {
                if(Hue.msg_image_picker.is_highest())
                {
                    if(e.key === "Enter")
                    {
                        Hue.image_picker_submit()
                        e.preventDefault()
                    }

                    else if(e.key === "Tab")
                    {
                        Hue.do_media_picker_input_cycle("image")
                        e.preventDefault()
                    }

                    return
                }
            }

            if(Hue.tv_picker_open)
            {
                if(Hue.msg_tv_picker.is_highest())
                {
                    if(e.key === "Enter")
                    {
                        Hue.tv_picker_submit()
                        e.preventDefault()
                    }

                    else if(e.key === "Tab")
                    {
                        Hue.do_media_picker_input_cycle("tv")
                        e.preventDefault()
                    }

                    return
                }
            }

            if(Hue.radio_picker_open)
            {
                if(Hue.msg_radio_picker.is_highest())
                {
                    if(e.key === "Enter")
                    {
                        Hue.radio_picker_submit()
                        e.preventDefault()
                    }

                    else if(e.key === "Tab")
                    {
                        Hue.do_media_picker_input_cycle("radio")
                        e.preventDefault()
                    }

                    return
                }
            }

            if(Hue.upload_comment_open)
            {
                if(Hue.msg_upload_comment.is_highest())
                {
                    if(e.key === "Enter")
                    {
                        Hue.process_upload_comment()
                        e.preventDefault()
                    }
                }
            }

            if(Hue.open_room_open)
            {
                if(Hue.msg_info2.is_highest())
                {
                    if(e.key === "Enter")
                    {
                        if(e.shiftKey)
                        {
                            $("#open_room_here").trigger("click")
                        }

                        else
                        {
                            $("#open_room_new_tab").trigger("click")
                        }

                        e.preventDefault()
                    }

                    return
                }
            }

            if(Hue.background_image_input_open)
            {
                if(Hue.msg_info2.is_highest())
                {
                    if(e.key === "Enter")
                    {
                        Hue.background_image_input_action()
                        e.preventDefault()
                    }

                    return
                }
            }

            if(Hue.create_room_open)
            {
                if(Hue.msg_info2.is_highest())
                {
                    if(e.key === "Enter")
                    {
                        Hue.create_room_submit()
                        e.preventDefault()
                    }

                    return
                }
            }

            if(Hue.import_settings_open)
            {
                if(Hue.msg_info2.is_highest())
                {
                    if(e.key === "Enter")
                    {
                        Hue.process_imported_settings()
                        e.preventDefault()
                    }

                    return
                }
            }

            if(Hue.goto_room_open)
            {
                if(Hue.msg_info2.is_highest())
                {
                    if(e.key === "Enter")
                    {
                        Hue.goto_room_action()
                        e.preventDefault()
                    }

                    return
                }
            }

            if(Hue.writing_message)
            {
                if(Hue.msg_message.is_highest())
                {
                    if(e.key === "Enter" && !e.shiftKey)
                    {
                        Hue.send_popup_message()
                        e.preventDefault()
                    }

                    return
                }
            }

            if(Hue.modal_image_open)
            {
                if(Hue.msg_modal_image.is_highest())
                {
                    if(e.key === "ArrowLeft")
                    {
                        Hue.modal_image_prev_click()
                        e.preventDefault()
                    }

                    else if(e.key === "ArrowRight")
                    {
                        Hue.modal_image_next_click()
                        e.preventDefault()
                    }

                    else if(e.key === "ArrowUp")
                    {
                        Hue.modal_image_next_click()
                        e.preventDefault()
                    }

                    else if(e.key === "ArrowDown")
                    {
                        Hue.modal_image_prev_click()
                        e.preventDefault()
                    }

                    if(e.key === "Enter")
                    {
                        Hue.show_media_history("image")
                        e.preventDefault()
                    }

                    if(e.key === " ")
                    {
                        Hue.show_modal_image_number()
                        e.preventDefault()
                    }

                    return
                }
            }

            if(Hue.draw_image_open)
            {
                if(e.key === " ")
                {
                    Hue.draw_image_change_mode()
                }

                if(e.key === "z")
                {
                    if(e.ctrlKey)
                    {
                        Hue.draw_image_undo()
                    }
                }

                if(e.key === "y")
                {
                    if(e.ctrlKey)
                    {
                        Hue.draw_image_redo()
                    }
                }
            }

            if(Hue.modal_image_number_open)
            {
                if(e.key === "Enter")
                {
                    Hue.modal_image_number_go()
                }
            }

            if(Hue.writing_reply)
            {
                if(Hue.msg_reply.is_highest())
                {
                    if(e.key === "Enter" && !e.shiftKey)
                    {
                        Hue.submit_reply()
                        e.preventDefault()
                    }

                    return
                }
            }

            if(Hue.change_user_username_open)
            {
                if(Hue.msg_info2.is_highest())
                {
                    if(e.key === "Enter" && !e.shiftKey)
                    {
                        Hue.submit_change_username()
                        e.preventDefault()
                    }

                    return
                }
            }

            if(Hue.change_user_password_open)
            {
                if(Hue.msg_info2.is_highest())
                {
                    if(e.key === "Enter" && !e.shiftKey)
                    {
                        Hue.submit_change_password()
                        e.preventDefault()
                    }

                    return
                }
            }

            if(Hue.change_user_email_open)
            {
                if(Hue.msg_info2.is_highest())
                {
                    if(e.key === "Enter" && !e.shiftKey)
                    {
                        Hue.submit_change_email()
                        e.preventDefault()
                    }

                    return
                }
            }

            return
        }

        if(Hue.editing_message)
        {
            Hue.focus_edit_area()

            if(e.key === "Enter" && !e.shiftKey)
            {
                Hue.send_edit_messsage()
                e.preventDefault()
            }

            else if(e.key === "Escape")
            {
                Hue.stop_edit_message()
                e.preventDefault()
            }

            else if(e.key === "ArrowUp")
            {
                let res = Hue.handle_edit_direction()

                if(res)
                {
                    e.preventDefault()
                }
            }

            else if(e.key === "ArrowDown")
            {
                let res = Hue.handle_edit_direction(true)

                if(res)
                {
                    e.preventDefault()
                }
            }

            return false
        }

        if(Hue.synth_open)
        {
            if(Hue.synth_voice_input_focused)
            {
                if(e.key === "Enter")
                {
                    Hue.send_synth_voice()
                }

                if(e.key === "Escape")
                {
                    if($("#synth_voice_input").val())
                    {
                        Hue.clear_synth_voice()
                    }

                    else
                    {
                        Hue.hide_synth(true)
                    }
                }

                return false
            }
        }

        if(!(e.ctrlKey && window.getSelection().toString() !== ""))
        {
            Hue.focus_input()
        }

        if(e.key === "Enter")
        {
            if(e.shiftKey)
            {
                Hue.add_linebreak_to_input()
            }

            else
            {
                if($("#input").val().length === 0)
                {
                    Hue.goto_bottom(true)
                }

                else
                {
                    Hue.process_message({message:$('#input').val()})
                }
            }

            e.preventDefault()
            return
        }

        else if(e.key === "ArrowUp")
        {
            if(Hue.input_oversized_active() && !e.shiftKey)
            {
                return
            }

            if(e.shiftKey)
            {
                Hue.input_history_change("up")
                e.preventDefault()
            }

            else if(e.ctrlKey)
            {
                Hue.scroll_up(Hue.config.small_keyboard_scroll)
                e.preventDefault()
            }

            else
            {
                Hue.edit_last_message()
            }

            return
        }

        else if(e.key === "ArrowDown")
        {
            if(Hue.input_oversized_active() && !e.shiftKey)
            {
                return
            }

            if(e.shiftKey)
            {
                Hue.input_history_change("down")
                e.preventDefault()
            }

            else if(e.ctrlKey)
            {
                Hue.scroll_down(Hue.config.small_keyboard_scroll)
                e.preventDefault()
            }

            else
            {
                Hue.goto_bottom(true, true)
            }

            return
        }

        else if(e.key === "PageUp")
        {
            if(e.shiftKey)
            {
                Hue.goto_top()
            }

            else
            {
                Hue.scroll_up(Hue.config.big_keyboard_scroll)
            }

            e.preventDefault()
            return
        }

        else if(e.key === "PageDown")
        {
            if(e.shiftKey)
            {
                Hue.goto_bottom(true)
            }

            else
            {
                Hue.scroll_down(Hue.config.big_keyboard_scroll)
            }

            e.preventDefault()
            return
        }

        else if(e.key === "Escape")
        {
            if(!e.shiftKey)
            {
                if($("#input").val().length > 0)
                {
                    Hue.clear_input()
                    Hue.reset_input_history_index()
                }

                else
                {
                    Hue.goto_bottom(true, true)
                }

                Hue.hide_reactions_box()
                e.preventDefault()
                return
            }
        }
    })

    document.addEventListener('keyup', (e) =>
    {
        if(!Hue.started)
        {
            return
        }

        delete Hue.keys_pressed[e.keyCode]
    })

    document.addEventListener('input', (e) =>
    {
        if(Hue.modal_open && Hue.active_modal)
        {
            if($(e.target).data("mode") === "manual")
            {
                return false
            }

            Hue.do_modal_filter_timer()
        }
    })
}

// Resets double tap key press state
Hue.reset_double_tap_keys_pressed = function()
{
    Hue.double_tap_key_pressed = 0
    Hue.double_tap_key_2_pressed = 0
    Hue.double_tap_key_3_pressed = 0
}

// On double tap 1 action
Hue.on_double_tap = function()
{
    Hue.execute_commands("double_tap")
}

// On double tap 2 action
Hue.on_double_tap_2 = function()
{
    Hue.execute_commands("double_tap_2")
}

// On double tap 3 action
Hue.on_double_tap_3 = function()
{
    Hue.execute_commands("double_tap_3")
}