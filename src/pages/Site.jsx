import { useEffect, useMemo, useState } from "react";
import { useGlobalStore } from "@/store/useGlobalStore";
import { getSiteList, deleteSite, saveSite } from "@/api/site";
import { Table, Space, Button, Tag } from "antd";
import { invoke } from "@tauri-apps/api/core";
import SiteModal from "./components/SiteModal";
import "./Site.scss";

const Site = (props) => {
  const siteList = useGlobalStore((state) => state.siteList);
  const toggleSiteList = useGlobalStore((state) => state.toggleSiteList);
  const [openSiteModal, setOpenSiteModal] = useState(false);
  const [siteInfo, setSiteInfo] = useState({});

  const init = () => {
    getSiteList().then((res) => {
      toggleSiteList(res);
    });
  };

  const getStatus = (record) => {
    if (record.status == "不可用") {
      return (
        <Tag color="red" bordered={false}>
          不可用
        </Tag>
      );
    }
    return (
      <Tag color="cyan" bordered={false}>
        可用
      </Tag>
    );
  };

  const columns = [
    {
      title: "站点分组",
      dataIndex: "site_group",
      key: "site_group",
    },
    {
      title: "站点编码",
      dataIndex: "site_key",
      key: "site_key",
    },
    {
      title: "站点名称",
      dataIndex: "site_name",
      key: "site_name",
    },
    {
      title: "解析模式",
      dataIndex: "parse_mode",
      key: "parse_mode",
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (_, record) => getStatus(record),
    },
    {
      title: "网络状态",
      dataIndex: "ping",
      key: "ping",
      render: (_, record) => <WifiSignal api={record.api} />,
    },
    {
      title: "操作",
      dataIndex: "operation",
      key: "operation",
      render: (_, record) => (
        <Space size="middle">
          <a
            onClick={() => {
              setSiteInfo(record);
              setOpenSiteModal(true);
            }}
          >
            编辑
          </a>
          <a onClick={() => onDeleteSite(record)}>删除</a>
        </Space>
      ),
    },
  ];

  const onDeleteSite = async (site) => {
    deleteSite(site.id).then(() => {
      init();
    });
  };

  const handleSubmit = (params) => {
    saveSite(params).then(() => {
      init();
    });
  };

  const WifiSignal = ({ api }) => {
    const [delay, setDelay] = useState(10000);

    useEffect(() => {
      invoke("calculate_ping_latency", { host: api })
        .then((result) => {
          setDelay(result);
        })
        .catch(() => {
          setDelay(10000);
        });
    }, [api]);

    const signalLevel = useMemo(() => {
      let signalLevel = 0;

      // 根据延迟设置信号格数
      if (delay < 50) {
        signalLevel = 4;
      } else if (delay < 150) {
        signalLevel = 3;
      } else if (delay < 300) {
        signalLevel = 2;
      } else {
        signalLevel = 1;
      }

      return signalLevel;
    });

    // 渲染 Wi-Fi 信号图标，使用不同的类名来控制显示层数
    return (
      <div className="wifi-symbol">
        <div
          className={`wifi-circle first ${signalLevel == 4 ? "active" : ""}`}
        ></div>
        <div
          className={`wifi-circle second ${signalLevel >= 3 ? "active" : ""}`}
        ></div>
        <div
          className={`wifi-circle third ${signalLevel >= 2 ? "active" : ""}`}
        ></div>
        <div
          className={`wifi-circle fourth ${signalLevel >= 1 ? "active" : ""}`}
        ></div>
      </div>
    );
  };

  return (
    <div
      className={props.className ? "sitePage " + props.className : "sitePage"}
    >
      <Table
        tableLayout="auto"
        rowKey="site_key"
        title={() => (
          <div className="table-title">
            站点管理
            <Button
              color="cyan"
              variant="solid"
              size="small"
              onClick={() => {
                setOpenSiteModal(true);
                setSiteInfo({});
              }}
            >
              新增
            </Button>
          </div>
        )}
        columns={columns}
        dataSource={siteList}
      ></Table>
      {openSiteModal && (
        <SiteModal
          siteInfo={siteInfo}
          open={openSiteModal}
          onClose={() => setOpenSiteModal(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
};

export default Site;
