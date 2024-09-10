import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { pageActiveStore, updatePlayInfo } from "@/store/coreSlice";
import {
    downloadListStore,
    storeDownloadList,
    storeSiteList,
    updateSite,
    siteListStore
} from "@/store/movieSlice";
import { getSiteList, deleteSite, saveSite } from "@/db";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import { invoke } from "@tauri-apps/api/core";
import _, { result, set } from "lodash";
import { Toolbar } from "@mui/material";
import SiteModal from "./components/SiteModal";
import "./Site.scss";

const Site = (props) => {
    const dispatch = useAppDispatch();
    const pageActive = useAppSelector(pageActiveStore);
    const siteList = useAppSelector(siteListStore);
    const [openSiteModal, setOpenSiteModal] = useState(false);
    const [siteInfo, setSiteInfo] = useState({});

    useEffect(() => {
        if (pageActive === "site") {
            init();
        }
    }, [pageActive]);

    const init = () => {
        getSiteList().then((res) => {
            let allPing = [];
            res.forEach(element => {
                invoke('calculate_ping_latency', {host: element.api }).then(result => {
                    let site = {...element, ping : result};
                    dispatch(updateSite(site));
                })
            });
            dispatch(storeSiteList({ siteList: res, forceRefresh: true }));
        });
    };

    const finalTheme = createTheme({
        components: {
            MuiTableCell: {
                styleOverrides: {
                    head: {
                        fontWeight: 600,
                        fontSize: "16px",
                    },
                },
            },
        },
    });

    const getStatus = (status) => {
        switch (status) {
            case "不可用":
                return <Chip color="error" label="不可用" variant="outlined" />;
            case "可用":
                return <Chip color="success" label="可用" variant="outlined" />;
        }
    };

    const retryEvent = async (siteInfo) => {
        invoke('calculate_ping_latency', {host: siteInfo.api }).then(result => {
            let site = {...siteInfo, ping : result};
            dispatch(updateSite(site));
        })
    };

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

    const WifiSignal = ({ delay }) => {
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
      
        // 渲染 Wi-Fi 信号图标，使用不同的类名来控制显示层数
        return (
          <div className="wifi-symbol">
            <div className={`wifi-circle first ${signalLevel == 4 ? 'active' : ''}`}></div>
            <div className={`wifi-circle second ${signalLevel >= 3 ? 'active' : ''}`}></div>
            <div className={`wifi-circle third ${signalLevel >= 2 ? 'active' : ''}`}></div>
            <div className={`wifi-circle fourth ${signalLevel >= 1 ? 'active' : ''}`}></div>
          </div>
        );
      };

    return (
        <div
            className={
                props.className
                    ? "sitePage " + props.className
                    : "sitePage"
            }
        >
            <TableContainer className="siteTable" component={Paper}>
                <ThemeProvider theme={finalTheme}>
                    <Toolbar
                        sx={{
                            "&.MuiToolbar-root": {
                                padding: "0px 16px",
                            },
                        }}
                    >
                        <Typography
                            sx={{ flex: "1 1 100%" }}
                            variant="h7"
                            id="tableTitle"
                            component="div"
                        >
                            站点管理
                        </Typography>
                        <Button
                            color="success"
                            variant="outlined"
                            onClick={() => {
                                setOpenSiteModal(true);
                                setSiteInfo({});
                            }}
                        >
                            新增
                        </Button>
                    </Toolbar>
                    <Table sx={{ minWidth: 650 }} aria-label="下载表格">
                        <TableHead>
                            <TableRow>
                                <TableCell>站点分组</TableCell>
                                <TableCell>站点编码</TableCell>
                                <TableCell>站点名称</TableCell>
                                <TableCell>解析模式</TableCell>
                                <TableCell>状态</TableCell>
                                <TableCell sx={{ width: "10%" }}>网络状态</TableCell>
                                <TableCell align="center" sx={{ width: "10%" }}>
                                    操作
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {siteList.map((row) => (
                                <TableRow
                                    key={row.id}
                                    sx={{
                                        "&:last-child td, &:last-child th": {
                                            border: 0,
                                        },
                                    }}
                                >
                                    <TableCell component="th" scope="row">
                                        {row.site_group}
                                    </TableCell>
                                    <TableCell>{row.site_key}</TableCell>
                                    <TableCell>{row.site_name}</TableCell>
                                    <TableCell>{row.parse_mode}</TableCell>
                                    <TableCell>
                                        {getStatus(row.status)}
                                    </TableCell>
                                    <TableCell>
                                        <WifiSignal delay={row.ping} />
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={1}>
                                            <Button
                                                color="primary"
                                                onClick={() => retryEvent(row)}
                                            >
                                                检测
                                            </Button>
                                            <Button
                                                color="primary"
                                                onClick={() => {
                                                    console.log(row)
                                                    setSiteInfo(row);
                                                    setOpenSiteModal(true);
                                                }}
                                            >
                                                编辑
                                            </Button>
                                            <Button
                                                color="error"
                                                onClick={() =>
                                                    onDeleteSite(row)
                                                }
                                            >
                                                删除
                                            </Button>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ThemeProvider>
            </TableContainer>
            <SiteModal
                siteInfo={siteInfo}
                open={openSiteModal}
                onClose={() => setOpenSiteModal(false)}
                onSubmit={handleSubmit}
            />
        </div>
    );
};

export default Site;
