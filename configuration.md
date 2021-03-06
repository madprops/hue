# Configuration

Refer to [config.json](config/config.json) and [config.secret.json](config/config.secret.json) to check defaults.


"db_name"
>The database name Mongo will use. The database is created automatically at first launch. This setting allows trying different contexts by just changing the name, which is good for development and other cases.

"https_enabled"
>Defaults to true for security reasons. If deployed in a non-https environment set it to false. In order for it to be really enabled the Node environment must be set to production. If true, some non https media will be blocked. It's recommended to setup a full https site to conform to current standards. Check out Let's Encrypt.

"site_root"
>The root url where the system will work. Needs a slash at the end.

"main_room_id"
>The name of the main room. This is the room that will be joined when going to the root url. This room is created automatically when first joined.

"default_main_room_name"
>The default name of the main room. Just like any room, this can be changed later.

"images_directory"
>The directory where uploaded images will be stored.

"public_images_location"
>The public root of images. For example a public_images_location of /img/ would send public image urls as /img/image.jpg, which would reside in public/img/. Needs a slash at the end.

"default_image_source"
>Default source for the image for new rooms or when "/image default" is issued.

"default_tv_source"
>Default source for the tv for new rooms or when "/tv default" is issued.

"default_tv_title"
>The title for the default tv.

"default_tv_type"
>The type of the default_tv_source, either "video", "youtube", "twitch", "soundcloud" or "iframe".

"default_profile_image_url"
>The location of the default profile image.

"profile_image_loading_url"
>The location of the loading image when the profile image is changing.

"default_background_image_url"
>The location of the default background image.

"background_image_loading_url"
>The location of the loading image when the background image is changing.

"default_video_url"
>Image to show to video element when there's no video image loaded.

"mongodb_path"
>The path to the MongoDB database. The name can be anything as long as the port is correct.

"topic_separator"
>Separator used between topic sections. Used when using /topicadd, which adds a new piece of topic at the end of the current topic. Also used when calculating the removal of these topic sections.

"title_separator"
>Separator used to separate the room name and the topic in the browser tab's title.

"default_title"
>The default tab title of a room. This appears before the room information has been gathered to set the first title.

"login_title"
>The title of the login page.

"register_title"
>The title of the registration page.

"default_topic"
>The shown topic when the room is created.

"played_crop_limit"
>Same as chat_crop limit but for items displayed when "Now Playing" is clicked.

"max_input_length"
>Maximum amount of text for something typed in the input box. If something bigger is inputed it will get cropped to meet this limit.

"max_topic_length"
>The maximum length of a room topic. If a longer topic is tried to be set with /topic it will get cropped to meet this limit. /topicadd and /topicaddstart will throw an error if there is no more room to add to the topic.

"max_username_length"
>Maximum length for usernames.

"max_max_username_length"
>This is a safety used when validating usernames on login. In case max or min username length configurations where changed when there were already users registered, this arbitrary big number is used to check something huge is not being inputed instead of checking with the username length configuration options, to avoid old username from not being able to login. This likely shouldn't be changed.

"min_password_length"
>Minimum length for passwords. It must be at least 1.

"max_password_length"
>Maximum length for passwords.

"max_max_password_length"
>Same as max_max_username_length but for passwords.

"max_email_length"
>Maximum length for email addresses.

"max_max_email_length"
>Same as max_max_username_length but for emails.

"password_reset_limit"
>How long a user must wait to perform another password reset.

"password_reset_expiration"
>How long a reset password link will be valid.

"max_room_name_length"
>Max length for room names.

"max_room_id_length"
>Arbitrary big number to avoid big urls from being considered as valid room ids. Mongo ids are approximately 24 chars in length as for 2017.

"rooms_loop_interval"
>The interval in milliseconds for the loop that saves iterates through a rooms object which is updated through chat activity and saves it to the database. This loops is to avoid saving data, like log messages, to the database on every message.

"files_loop_interval"
>Interval of the loop to check for expired files that failed to be uploaded properly and delete them from memory.

"files_loop_max_diff"
>Amount of time for file upload to be inactive for it to be considered expired.

"upload_slice_size"
>The sice of file slices to be uploaded.

"max_media_source_length"
>Maximum length of a media source urls.

"max_log_messages"
>Maximum amount of messages to store in room logs. It stores chat messages and some notifications like image uploads and tv changes.

"max_admin_log_messages"
>Maximum amount of messages to store in room admin logs. It stores information about the most recent admin activity.

"max_title_length"
>Maximum length for the tab's title. Title consists of "room_name - topic" and is set automatically. If title is bigger it gets cropped.

"max_image_size"
>Maximum image size allowed in KB. This is checked both in the client and server. If the image is bigger it won't be uploaded.

"max_image_size_bytes"
>Maximum image size allowed in Bytes.

"max_profile_image_size"
>Maximum image size allowed for profile images.

"upload_spam_slice"
>The higher this number is, the slower it adds spam on file upload

"youtube_enabled"
>Whether Youtube features are enabled.

"twitch_enabled"
>Whether Twitch features are enabled.

"soundcloud_enabled"
>Whether Soundcloud features are enabled.

"imgur_enabled"
>Whether Imgur features are enabled.

"iframes_enabled"
>Whether embedded iframes are enabled.

"antispam_banTime"
>How much time in minutes a user is banned from the system after being detected as a spammer by the automatic spam detection system.

"antispam_kickThreshold"
>User gets kicked after this many spam score

"antispam_kickTimesBeforeBan"
>User gets banned after this many kicks

"antispam_banning"
>Uses temp IP banning after kickTimesBeforeBan

"antispam_heartBeatStale"
>Removes a heartbeat after this many seconds

"antispam_heartBeatCheck"
>Checks a heartbeat per this many seconds

"session_cookie_max_age"
>The amount of time a session cookie is valid. This cookie determines if a user needs to login again when entering.

"encryption_cost"
>This is used for the password hashing. A cost of 12 are 4096 salt rounds. The more rounds, the more secure the hash is, but it takes longer to process.

"mail_enabled"
>Whether a mailgun account is to be used for mail delivery, for example for password resets. If this is enabled, the "Forgot Password" link will appear in the login page.

"max_url_length"
>Url lengths beyond this are ignored by the system. This is to avoid triggering actions on urls that are likely wrong or meant as an attack.

"max_stored_images"
>The amount of most recent images to have stored in a room. Each room has an array of images stored, when the array's length surpasses this number, the oldest image in it will get deleted.

"settings_default_highlight_current_username"
>Whether current username triggers a highlight by default.

"settings_default_case_insensitive_username_highlights"
>Whether highlights for current username are case insensitive by default.

"settings_default_open_whispers_automatically"
>Whether popup messages will open automatically when arrived by default.

"settings_default_show_image_previews"
>Whether image links get a preview on the chat area by default. This only works with certain links, including direct Imgur links.

"settings_default_show_link_previews"
>Whether links get a preview on the chat area by default.

"settings_default_show_highlight_notifications"
>Whether to show desktop notifications on highlights, by default.

"settings_default_show_activity_notifications"
>Whether to show activity notifications on highlights, by default.

"room_state_default_images_enabled"
>Whether images will be enabled by default.

"room_state_default_tv_enabled"
>Whether tv will be enabled by default.

"room_state_default_last_highlight_date"
>Default date to check for new highlights to announce at startup.

"room_state_default_chat_display_percentage"
>Default percentage of the width the chat area will have in new rooms.

"room_state_default_tv_display_percentage"
>Default percentage of the height the tv will have in the split media area in new rooms.

"room_state_default_tv_display_position"
>Default position the tv will have in the split media area in new rooms. (top or bottom)

"room_state_default_media_layout"
>Default media area (image, tv) layout, either column or row.

"jwt_expiration"
>How long jwt will be valid after login.

"max_user_id_length"
>After this length, this is clearly not a user id.

"max_same_post_diff"
>Maximum difference in time between a message and and another from the same user to be displayed within the same post.

"max_same_post_diff"
>Maximum messages within a post. After this a new post is displayed.

"max_typing_inactivity"
>After the last typing signal has being received, it will stop showing the typing status after this amount of time.

"max_verification_time"
>How much time a verification link will be active after registration. If it's not used before this it won't work.

"delivery_email"
>Email address from where system emails are sent.

"delivery_email_name"
>Name used on system emails.

"media_changed_crop_limit"
>How many items are stored in images_changed and tv_changed.

"email_change_limit"
>How long a user must wait to perform another email verification.

"email_change_expiration"
>How long an email verification code will be valid.

"email_change_code_max_length"
>Arbitrary long length to consider email verification codes.

"create_room_cooldown"
>How long a user must wait to create another room.

"recaptcha_enabled"
>Whether recaptcha verification is used at registration.

"socket_emit_throttle"
>Throttle on socket emits on the client.

"safe_limit_*"
>Generic limits used to check data length.

"data_max_items"
>Maximum amount of data items allowed in socket emits.

"data_items_max_string_length"
>Used to check string data.

"data_items_max_number_length"
>Used to check number data.

"profile_image_diameter"
>The diameter of the cropped profile image selected by the user.

"max_num_newlines"
>Maximum amount of newlines allowed per message.

"image_change_cooldown"
>How much it should wait in milliseconds before images can be changed again after last change.

"tv_change_cooldown"
>How much it should wait in milliseconds before tv can be changed again after last change.

"max_sockets_per_user"
>How many active sockets a user can have at the same time. After this limit all incoming socket connections are droppped.

"activity_bar_interval"
>How often to check for obsolete items in the top activity bar to remove them.

"max_activity_bar_items"
>Maximum amount of top activity bar items at the same time.

"redis_max_link_age"
>How old link data has to be to be fetched again.

"link_fetch_timeout"
>Maximum time to get a response when fetching link data.

"link_max_title_length"
>After this the title from fetched link metadata gets cropped.

"url_title_max_length"
>Maximum length for urls to be shown fully in window titles. After this they get cropped and "..." is added.

"max_bio_length"
>Character length of user bios.

"max_bio_lines"
>Maximum number of linebreaks allowed in user bios.

"send_badge_cooldown"
>How much time sending a badge is disabled after the last badge sent.

"badge_feedback_duration"
>How long a profile image stays changed after a badge is received.

"max_info_popups"
>How many info popups (bottom right) can be displayed at once. After this, the older ones get closed.

"notifications_crop_limit"
>How many notifications after the notifications items get cropped in the notifications window.

"max_media_comment_length"
>Maximum length of comments on media change.

"max_message_board_posts"
>How big the message board is. How many posts it stores.

"max_message_board_post_length"
>How long message board posts can be.

"system_username"
>Reserved username for system messages.

"commands_prefix"
The character before commands.
For example "/" in "/somecommand"


## The following reside in config.secret.json

"youtube_api_key"
>The Youtube v3 Api key used to fetch video information from urls or to search for videos by search terms using /tv.

"session_secret"
>Used for express-session security. Change it to anything you want.

"mailgun_api_key"
>An api key from mailgun.com to enable mail delivery, used for password resets.

"mailgun_domain"
>The domain registered in mailgun.com

"jwt_secret"
>Secret key for the jwt system when logging in.

"recaptcha_key"
>Public google recaptcha key.

"soundcloud_id"
>Soundcloud API ID.

"recaptcha_secret_key"
>Soundcloud API Secret.

"recaptcha_secret_key"
>Secret google recaptcha key.

"imgur_client_id"
>Imgur client id.