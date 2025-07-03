import { useEffect } from "react";
import { useGlobalStore } from "@/store/useGlobalStore";
import { useMovieStore } from "@/store/useMovieStore";
import { selectAllDownloadInfo, deleteDownloadInfo } from "@/api/downloadInfo";
import { Progress, Table, Space, Tag } from "antd";
import { invoke } from "@tauri-apps/api/core";
import _ from "lodash";
import "./Download.scss";
import { useConfig } from "@/hooks";

const LinearProgressWithLabel = (props) => (
  <div style={{ display: "flex", alignItems: "center" }}>
    <div style={{ width: "100%", mr: 1 }}>
      <Progress variant="determinate" {...props} />
    </div>
  </div>
);

const Download = (props) => {
  const togglePlayInfo = useGlobalStore((state) => state.togglePlayInfo);
  const downloadInfoList = useMovieStore((state) => state.downloadInfoList);
  const toggleDownloadInfoList = useMovieStore((state) => state.toggleDownloadInfoList);
  const updateDownloadInfoProcess = useGlobalStore((state) => state.updateDownloadInfoProcess);
  const [downloadSavePath] = useConfig("downloadSavePath", "");

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const res = await selectAllDownloadInfo();
    toggleDownloadInfoList(res);
  };

  const getPercentage = (rowData) => {
    const percentageNum =
      rowData.count === 0
        ? 0.0
        : _.divide(rowData.download_count, rowData.count) * 100;
    return _.ceil(percentageNum, 2);
  };

  const getDownloadStatus = (downloadStatus) => {
    const statusMap = {
      wait: { color: "info", label: "等待下载" },
      downloading: { color: "secondary", label: "下载中" },
      downloadFail: { color: "error", label: "下载失败" },
      downloadSuccess: { color: "success", label: "下载成功" },
    };
    const status = statusMap[downloadStatus];
    return status ? (
      <Tag color={status.color} bordered={false}>
        {status.label}
      </Tag>
    ) : null;
  };

  const getStatus = (status) => {
    const statusMap = {
      parseSource: "解析资源",
      downloadSlice: "下载ts分片",
      checkSource: "检测完整性",
      merger: "合并视频",
      downloadEnd: "下载结束",
    };
    return (
      <Tag
        color={status === "downloadEnd" ? "success" : "cyan"}
        bordered={false}
      >
        {statusMap[status]}
      </Tag>
    );
  };

  const columns = [
    {
      title: "影片名称",
      dataIndex: "movie_name",
      key: "movie_name",
      ellipsis: true,
      width: "200px",
    },
    {
      title: "子标题",
      dataIndex: "sub_title_name",
      key: "sub_title_name",
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status) => getStatus(status),
    },
    {
      title: "下载进度",
      dataIndex: "download_progress",
      key: "download_progress",
      render: (_, record) => (
        <LinearProgressWithLabel percent={getPercentage(record)} />
      ),
    },
    {
      title: "下载状态",
      dataIndex: "download_status",
      key: "download_status",
      render: (download_status) => getDownloadStatus(download_status),
    },
    {
      title: "操作",
      dataIndex: "operation",
      key: "operation",
      render: (_, record) => (
        <Space size="middle">
          {record.download_status === "downloadSuccess" && (
            <a onClick={() => playEvent(record)}>播放</a>
          )}
          {record.status !== "downloadEnd" && (
            <>
              <a onClick={() => retryEvent(record)}>重试</a>
              <a onClick={() => movieMerger(record)}>合并</a>
            </>
          )}
          {record.status === "downloadFail" && (
            <>
              <a onClick={() => movieMerger(record)}>强制合并</a>
            </>
          )}
          <a onClick={() => onDeleteDownload(record)}>删除</a>
        </Space>
      ),
    },
  ];

  const playEvent = (downloadInfo) => {
    const playInfo = {
      playState: "newPlay",
      playType: "localMovie",
      isLive: false,
      name: downloadInfo.movie_name,
      iptv: { channelGroupId: 0, channelActive: "" },
      download: { downloadId: downloadInfo.id },
      movieInfo: { siteKey: "", ids: "", index: 0, videoFlag: "", onlineUrl: "" },
    };
    togglePlayInfo(playInfo, true);
  };

  const retryEvent = async (download) => {
    const downloadInfo = {
      ...download,
      download_status: "downloading",
      save_path: downloadSavePath,
    };
    await invoke("retry_download", { download: downloadInfo });
  };

  const movieMerger = async (download) => {
    const di = await invoke("movie_merger", { download });
    if (di) {
      const diInfo = _.cloneDeep(download);
      diInfo.download_status = di.download_status;
      diInfo.status = di.status;
      updateDownloadInfoProcess(diInfo);
    }
  };

  const onDeleteDownload = async (download) => {
    await deleteDownloadInfo({ id: download.id });
    init();
  };

  return (
    <div
      className={
        props.className ? `downloadPage ${props.className}` : "downloadPage"
      }
    >
      <Table rowKey="id" columns={columns} dataSource={downloadInfoList}></Table>
    </div>
  );
};

export default Download;
