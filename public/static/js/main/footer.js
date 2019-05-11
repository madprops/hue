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

    Hue.horizontal_separator.separate("footer_media_items")
}