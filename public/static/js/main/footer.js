// Sets visibility of footer media icons based on media permissions
Hue.setup_footer_icons = function()
{
    if(Hue.room_images_mode === "disabled")
    {
        $("#footer_images_controls").css("display", "none")
    }

    else
    {
        $("#footer_images_controls").css("display", "flex")
    }

    if(Hue.can_images)
    {
        $("#footer_images_icon_container").css("display", "flex")
    }

    else
    {
        $("#footer_images_icon_container").css("display", "none")
    }

    if(Hue.room_tv_mode === "disabled")
    {
        $("#footer_tv_controls").css("display", "none")
    }

    else
    {
        $("#footer_tv_controls").css("display", "flex")
    }

    if(Hue.can_tv)
    {
        $("#footer_tv_icon_container").css("display", "flex")
    }

    else
    {
        $("#footer_tv_icon_container").css("display", "none")
    }

    if(Hue.room_radio_mode === "disabled")
    {
        $("#footer_radio_controls").css("display", "none")
    }

    else
    {
        $("#footer_radio_controls").css("display", "flex")
    }

    if(Hue.can_radio)
    {
        $("#footer_radio_icon_container").css("display", "flex")
    }

    else
    {
        $("#footer_radio_icon_container").css("display", "none")
    }
}

// Setups more footer elements
Hue.setup_footer = function()
{
    $("#footer_images_icon").on("auxclick", function(e)
    {
        if(e.which === 2)
        {
            $("#image_file_picker").click()
        }
    })

    $("#footer_user_menu_container").on("auxclick", function(e)
    {
        if(e.which === 2)
        {
            Hue.clear_show_reactions_box()
            Hue.show_global_settings()
        }
    })

    $("#footer_media_menu_container").on("auxclick", function(e)
    {
        if(e.which === 2)
        {
            Hue.stop_media()
        }
    })

    $("#footer_media_rotate").click(function()
    {
        if(Hue.num_media_elements_visible() < 2)
        {
            return false
        }

        Hue.swap_media_layout()
    })

    $("#footer_media_rotate").on("auxclick", function(e)
    {
        if(Hue.num_media_elements_visible() < 2)
        {
            return false
        }

        if(e.which === 2)
        {
            Hue.swap_display_positions_2()
        }
    })

    Hue.horizontal_separator.separate("footer_media_items")
}

// Checks how to handle the rotate icon
Hue.check_footer_media_rotate = function()
{
    if(Hue.num_media_elements_visible() < 2)
    {
        $("#footer_media_rotate").addClass("faded")
    }
    
    else
    {
        $("#footer_media_rotate").removeClass("faded")
    }
}