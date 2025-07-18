diesel::table! {
    download_info (id) {
        id -> Text,
        movie_name -> Text,
        url -> Text,
        sub_title_name -> Text,
        status -> Text,
        download_count -> Integer,
        count -> Integer,
        download_status -> Text,
        create_time -> Text,
        update_time -> Nullable<Text>,
    }
}

diesel::table! {
    star (id) {
        id -> Text,
        star_name -> Text,
        ids -> Text,
        site_key -> Text,
        movie_type -> Nullable<Text>,
        year -> Text,
        note -> Nullable<Text>,
        douban_rate -> Nullable<Text>,
        has_update -> Text,
        last_update_time -> Nullable<Text>,
        position -> Double,
        pic -> Text,
        area -> Nullable<Text>,
        create_time -> Text,
        update_time -> Nullable<Text>,
    }
}

diesel::table! {
    website_parse (id) {
        id -> Nullable<Integer>,
        website_key -> Text,
        website_parse_url -> Text,
        position -> Double,
    }
}

diesel::table! {
    shortcut (id) {
        id -> Nullable<Integer>,
        key -> Text,
        name -> Text,
        desc -> Text,
    }
}

diesel::table! {
    channel_group (id) {
        id -> Nullable<Integer>,
        channel_name -> Text,
        channel_group_name -> Text,
        channel_active -> Text,
        channel_status -> Text,
        position -> Nullable<Double>,
        channels -> Text,
    }
}

diesel::table! {
    search_record (id) {
        id -> Nullable<Integer>,
        keywords -> Text,
    }
}

diesel::table! {
    history (id) {
        id -> Text,
        history_name -> Text,
        ids -> Text,
        index -> Integer,
        start_position -> Integer,
        end_position -> Integer,
        play_time -> Double,
        site_key -> Text,
        online_play -> Nullable<Text>,
        detail -> Text,
        video_flag -> Nullable<Text>,
        duration -> Double,
        has_update -> Text,
        create_time -> Text,
        update_time -> Nullable<Text>,
    }
}

diesel::table! {
    site (id) {
        id -> Text,
        site_key -> Text,
        site_name -> Text,
        api -> Text,
        site_group -> Text,
        is_active -> Text,
        status -> Text,
        position -> Nullable<Double>,
        is_reverse_order -> Text,
        parse_mode -> Nullable<Text>,
        create_time -> Text,
        update_time -> Nullable<Text>,
    }
}

diesel::table! {
    site_class (id) {
        id -> Text,
        class_id -> Text,
        site_key -> Text,
        class_name -> Text,
        create_time -> Text,
        update_time -> Nullable<Text>,
    }
}
