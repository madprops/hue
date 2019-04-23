// Restarts the client
Hue.restart_client = function()
{
    Hue.user_leaving = true
    window.location = window.location
}

// Send a signal to an Electron client
Hue.electron_signal = function(func, data={})
{
    if(window["electron_api"] === undefined)
    {
        return false
    }

    if(window["electron_api"][func] !== undefined)
    {
        window["electron_api"][func](data)
    }
}

// Simple emit to check server response
Hue.ping_server = function()
{
    Hue.socket_emit("ping_server", {date:Date.now()})
}

// Calculates how much time the pong response took to arrive
Hue.pong_received = function(data)
{
    let nice_time = Hue.utilz.nice_time(Date.now(), data.date)
    Hue.feedback(`Pong: ${nice_time}`)
}

// Sends an activity signal to the server
// This is used to know which users might be active
// This is used to display users in the activity bar
Hue.trigger_activity = function()
{
    Hue.socket_emit("activity_trigger", {})
}

// Only for superusers
// Sends a system restart signal that tells all clients to refresh
Hue.send_system_restart_signal = function()
{
    Hue.socket_emit("system_restart_signal", {})
}

// Shows a message saying the client disconnects
// When clicked the client is refreshed
Hue.show_refresh_button = function()
{
    Hue.feedback("Disconnected. Click here to refresh",
    {
        onclick: function()
        {
            Hue.restart_client()
        },
        brk: "<i class='icon2c fa fa-plug'></i>"
    })
}