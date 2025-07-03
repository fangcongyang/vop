-- This file should undo anything in `up.sql`
create table if not exists `site` (
	id TEXT PRIMARY KEY NOT NULL , --主键id
	site_key TEXT NOT NULL  , --编码
	site_name TEXT NOT NULL  , --名称
	api TEXT NOT NULL  , --网站api地址
	site_group TEXT NOT NULL  , --影视
	is_active TEXT NOT NULL  , --是否激活;1 激活 0不激活
	`status` TEXT NOT NULL  , --状态;可用 不可用
	position REAL NOT NULL  , --排序
	is_reverse_order TEXT NOT NULL, --网站分页降序; 1降序 0升序
	parse_mode TEXT NOT NULL, --解析模式; json xml
	create_time TEXT NOT NULL, --创建时间
	update_time TEXT NOT NULL --更新时间
);

create table if not exists site_class (
	id TEXT PRIMARY KEY NOT NULL , --主键id
	class_id TEXT NOT NULL  , --分类id
	site_key TEXT NOT NULL  , --网站key
	class_name TEXT NOT NULL  , --分类名称
	create_time TEXT NOT NULL, --创建时间
	update_time TEXT  --更新时间
);

create INDEX idx_site_class_site_key on site_class(`site_key`);

create table if not exists history (
	id TEXT PRIMARY KEY NOT NULL , --主键id
	history_name TEXT NOT NULL  , --名称
	ids TEXT NOT NULL  , --网站资源唯一id;网站id+视频id
	`index` INTEGER NOT NULL  , --播放集数
	start_position INTEGER   , --开始跳过时间
	end_position INTEGER   , --结束跳过时间
	play_time REAL   , --已播放时长
	site_key TEXT NOT NULL  , --网站key
	online_play TEXT   , --在线播放
	detail TEXT NOT NULL,  --明细信息
	video_flag TEXT NOT NULL,  --视频标识
	duration REAL  ,  --视频时长
	has_update TEXT NOT NULL,  --是否有更新
	create_time TEXT NOT NULL,  --创建时间
	update_time TEXT  --更新时间
);

create unique index idx_history_site_key_ids on history(`site_key`, `ids`);

create table if not exists star (
	id TEXT PRIMARY KEY NOT NULL , --主键id
	star_name TEXT NOT NULL  , --名称
	ids TEXT NOT NULL  , --网站资源唯一id;网站id+视频id
	site_key TEXT NOT NULL  , --网站key
	movie_type TEXT  , --影片类型
	`year` TEXT  , --上映时间
	note TEXT  , --影片备注
	douban_rate TEXT  , --影片豆瓣评分
	has_update TEXT NOT NULL,  --是否有更新
	last_update_time TEXT, --上次更新时间
	position REAL NOT NULL, --排序
	pic TEXT , --图片
	area TEXT  , --地区
	create_time TEXT NOT NULL, --创建时间
	update_time TEXT  --更新时间
);

create table if not exists download_info (
	id TEXT PRIMARY KEY NOT NULL , --主键id
	movie_name TEXT NOT NULL  , --影片名称
	`url` TEXT NOT NULL  , --影片url
	sub_title_name TEXT NOT NULL  , --子标题名称
	`status` TEXT NOT NULL  , --状态; 1 下载中 2 下载完成 3 下载失败
	download_count INTEGER NOT NULL, --下载分片总数
	count INTEGER NOT NULL, --分片总数
	download_status TEXT NOT NULL, --下载状态
	create_time TEXT NOT NULL, --创建时间
	update_time TEXT  --更新时间
);
