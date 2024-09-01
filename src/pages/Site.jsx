import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { pageActiveStore, updatePlayInfo } from "@/store/coreSlice";
import {
    downloadListStore,
    storeDownloadList,
    storeSiteList,
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
import _, { set } from "lodash";
import { Toolbar } from "@mui/material";
import SiteModal from "./components/SiteModal";

const Site = (props) => {
    const dispatch = useAppDispatch();
    const pageActive = useAppSelector(pageActiveStore);
    const [siteList, setSiteList] = useState([]);
    const [openSiteModal, setOpenSiteModal] = useState(false);
    const [siteInfo, setSiteInfo] = useState({});

    useEffect(() => {
        if (pageActive === "site") {
            init();
        }
    }, [pageActive]);

    const init = () => {
        getSiteList().then((res) => {
            setSiteList(res);
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

    const retryEvent = async (download) => {
        let save_path = await getDownloadSavePath();
        let downloadInfo = { ...download };
        downloadInfo.download_status = "downloading";
        downloadInfo["save_path"] = save_path;
        await invoke("retry_download", { download: downloadInfo });
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

    return (
        <div
            className={
                props.className
                    ? "settingsPage " + props.className
                    : "settingsPage"
            }
        >
            <TableContainer component={Paper}>
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
