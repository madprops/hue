module.exports = function (c, config) {
  // Automatically includes all global settings and room state config options
  for (let key in config) {
    if (
      key.startsWith("global_settings_default") ||
      key.startsWith("room_state_default")
    ) {
      c.vars[key] = config[key]
    }
  }

  // Fills the config object with relevant config options
  c.vars.main_room_id = config.main_room_id
  c.vars.default_image_source = config.default_image_source
  c.vars.default_tv_source = config.default_tv_source
  c.vars.default_tv_title = config.default_tv_title
  c.vars.default_tv_type = config.default_tv_type
  c.vars.opacity_amount_1 = config.opacity_amount_1
  c.vars.opacity_amount_2 = config.opacity_amount_2
  c.vars.opacity_amount_3 = config.opacity_amount_3
  c.vars.color_contrast_amount_1 = config.color_contrast_amount_1
  c.vars.color_contrast_amount_2 = config.color_contrast_amount_2
  c.vars.color_contrast_amount_3 = config.color_contrast_amount_3
  c.vars.color_contrast_amount_4 = config.color_contrast_amount_4
  c.vars.color_contrast_amount_5 = config.color_contrast_amount_5
  c.vars.played_crop_limit = config.played_crop_limit
  c.vars.input_history_crop_limit = config.input_history_crop_limit
  c.vars.max_input_length = config.max_input_length
  c.vars.max_topic_length = config.max_topic_length
  c.vars.max_username_length = config.max_username_length
  c.vars.max_max_username_length = config.max_max_username_length
  c.vars.max_room_name_length = config.max_room_name_length
  c.vars.max_media_source_length = config.max_media_source_length
  c.vars.max_title_length = config.max_title_length
  c.vars.small_keyboard_scroll = config.small_keyboard_scroll
  c.vars.big_keyboard_scroll = config.big_keyboard_scroll
  c.vars.max_image_size = config.max_image_size
  c.vars.topic_separator = config.topic_separator
  c.vars.title_separator = config.title_separator
  c.vars.default_title = config.default_title
  c.vars.default_topic = config.default_topic
  c.vars.default_topic_admin = config.default_topic_admin
  c.vars.youtube_enabled = config.youtube_enabled
  c.vars.twitch_enabled = config.twitch_enabled
  c.vars.soundcloud_enabled = config.soundcloud_enabled
  c.vars.imgur_enabled = config.imgur_enabled
  c.vars.iframes_enabled = config.iframes_enabled
  c.vars.min_password_length = config.min_password_length
  c.vars.max_password_length = config.max_password_length
  c.vars.max_email_length = config.max_email_length
  c.vars.double_tap_key = config.double_tap_key
  c.vars.double_tap_key_2 = config.double_tap_key_2
  c.vars.double_tap_key_3 = config.double_tap_key_3
  c.vars.default_profile_image_url = config.default_profile_image_url
  c.vars.profile_image_loading_url = config.profile_image_loading_url
  c.vars.default_background_image_url = config.default_background_image_url
  c.vars.background_image_loading_url = config.background_image_loading_url
  c.vars.upload_slice_size = config.upload_slice_size
  c.vars.max_same_post_diff = config.max_same_post_diff
  c.vars.max_same_post_messages = config.max_same_post_messages
  c.vars.max_typing_inactivity = config.max_typing_inactivity
  c.vars.default_video_url = config.default_video_url
  c.vars.media_changed_crop_limit = config.media_changed_crop_limit
  c.vars.email_change_code_max_length = config.email_change_code_max_length
  c.vars.socket_emit_throttle = config.socket_emit_throttle
  c.vars.safe_limit_1 = config.safe_limit_1
  c.vars.safe_limit_2 = config.safe_limit_2
  c.vars.safe_limit_3 = config.safe_limit_3
  c.vars.safe_limit_4 = config.safe_limit_4
  c.vars.profile_image_diameter = config.profile_image_diameter
  c.vars.max_num_newlines = config.max_num_newlines
  c.vars.draw_coords_max_array_length = config.draw_coords_max_array_length
  c.vars.credits_background_url = config.credits_background_url
  c.vars.credits_audio_url = config.credits_audio_url
  c.vars.credits_title = config.credits_title
  c.vars.image_domain_white_or_black_list =
    config.image_domain_white_or_black_list
  c.vars.image_domain_list = config.image_domain_list
  c.vars.tv_domain_white_or_black_list = config.tv_domain_white_or_black_list
  c.vars.tv_domain_list = config.tv_domain_list
  c.vars.max_activity_bar_delay = config.max_activity_bar_delay
  c.vars.activity_bar_interval = config.activity_bar_interval
  c.vars.activity_bar_trigger_interval = config.activity_bar_trigger_interval
  c.vars.max_activity_bar_items = config.max_activity_bar_items
  c.vars.old_activity_min = config.old_activity_min
  c.vars.max_chat_searches = config.max_chat_searches
  c.vars.url_title_max_length = config.url_title_max_length
  c.vars.max_bio_length = config.max_bio_length
  c.vars.max_bio_length = config.max_bio_length
  c.vars.max_bio_lines = config.max_bio_lines
  c.vars.send_badge_cooldown = config.send_badge_cooldown
  c.vars.badge_feedback_duration = config.badge_feedback_duration
  c.vars.max_info_popups = config.max_info_popups
  c.vars.notifications_crop_limit = config.notifications_crop_limit
  c.vars.whispers_crop_limit = config.whispers_crop_limit
  c.vars.media_sync_cooldown = config.media_sync_cooldown
  c.vars.max_media_comment_length = config.max_media_comment_length
  c.vars.max_message_board_post_length = config.max_message_board_post_length
  c.vars.message_board_post_delay = config.message_board_post_delay
  c.vars.max_message_board_posts = config.max_message_board_posts
  c.vars.max_audio_clip_size = config.max_audio_clip_size
  c.vars.max_audio_clip_duration = config.max_audio_clip_duration
  c.vars.system_username = config.system_username
  c.vars.scramble_duration = config.scramble_duration
  c.vars.scramble_speed = config.scramble_speed
}
