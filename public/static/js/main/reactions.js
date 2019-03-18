// Sends a reaction to the chat
// Like 'happy
Hue.send_reaction = function(reaction_type)
{
    if(!Hue.can_chat)
    {
        Hue.feedback("You don't have permission to chat")
        return false
    }

    if(!Hue.reaction_types.includes(reaction_type))
    {
        return false
    }

    Hue.socket_emit("send_reaction", {reaction_type:reaction_type})

    Hue.hide_reactions_box()
}

// Shows a message depending on the reaction type
Hue.show_reaction = function(data, date=false)
{
    let d

    if(date)
    {
        d = date
    }

    else
    {
        d = Date.now()
    }

    let icon
    let message

    if(data.reaction_type === "like")
    {
        icon = "<i class='icon2c fa fa-thumbs-o-up'></i>"
        message = `likes this`
    }

    else if(data.reaction_type === "love")
    {
        icon = "<i class='icon2c fa fa-heart-o'></i>"
        message = `loves this`
    }

    else if(data.reaction_type === "happy")
    {
        icon = "<i class='icon2c fa fa-smile-o'></i>"
        message = `is feeling happy`
    }

    else if(data.reaction_type === "meh")
    {
        icon = "<i class='icon2c fa fa-meh-o'></i>"
        message = `is feeling meh`
    }

    else if(data.reaction_type === "sad")
    {
        icon = "<i class='icon2c fa fa-frown-o'></i>"
        message = `is feeling sad`
    }

    else if(data.reaction_type === "dislike")
    {
        icon = "<i class='icon2c fa fa-thumbs-o-down'></i>"
        message = `dislikes this`
    }

    else
    {
        return false
    }

    let f = function()
    {
        Hue.show_profile(data.username, data.profile_image)
    }

    Hue.update_chat(
    {
        id: data.id,
        brk: icon,
        message: message,
        username: data.username,
        prof_image: data.profile_image,
        third_person: true,
        date: d
    })
}

// Setups the reaction box's events
// This is the box that appears on user menu hover
// It includes reactions as well as user functions
Hue.setup_reactions_box = function()
{
    $("#footer_user_menu_container").hover(

    function()
    {
        clearTimeout(Hue.hide_reactions_timeout)

        Hue.show_reactions_timeout = setTimeout(function()
        {
            Hue.show_reactions_box()
        }, Hue.reactions_hover_delay)
    },

    function()
    {
        Hue.start_hide_reactions()
    })

    $("#reactions_box_container").hover(

    function()
    {
        Hue.mouse_over_reactions = true
        clearTimeout(Hue.hide_reactions_timeout)
    },

    function()
    {
        Hue.mouse_over_reactions = false
        Hue.start_hide_reactions()
    })

    $("#chat_area").click(function()
    {
        if(Hue.reactions_box_open)
        {
            Hue.hide_reactions_box()
        }
    })

    $("#input").click(function()
    {
        if(Hue.reactions_box_open)
        {
            Hue.hide_reactions_box()
        }
    })

    Hue.horizontal_separator.separate("reactions_box")
}

// Starts a timeout to hide the reactions box when the mouse leaves the box
Hue.start_hide_reactions = function()
{
    clearTimeout(Hue.show_reactions_timeout)

    Hue.hide_reactions_timeout = setTimeout(function()
    {
        if(Hue.mouse_over_reactions)
        {
            return false
        }

        Hue.hide_reactions_box()
    }, Hue.reactions_hover_delay_2)
}

// Shows the reactions box
Hue.show_reactions_box = function()
{
    if(!Hue.reactions_box_open)
    {
        $("#reactions_box_container").css("display", "flex")
        Hue.reactions_box_open = true
    }
}

// Hides the reactions box
Hue.hide_reactions_box = function()
{
    if(Hue.reactions_box_open)
    {
        $("#reactions_box_container").css("display", "none")
        Hue.reactions_box_open = false
    }
}