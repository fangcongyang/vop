import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { pageActiveStore, updatePlayInfo } from "@/store/coreSlice";
import { downloadListStore, storeDownloadList } from "@/store/movieSlice";
import { getAllDownloadList, getDownloadSavePath, deleteDownload } from "@/db";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    LinearProgress,
    Typography,
    Box,
    Chip,
    Stack,
    Button,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import _ from "lodash";

const LinearProgressWithLabel = (props) => (
    <Box sx={{ display: "flex", alignItems: "center" }}>
        <Box sx={{ width: "100%", mr: 1 }}>
            <LinearProgress variant="determinate" {...props} />
        </Box>
        <Box sx={{ minWidth: 5 }}>
            <Typography variant="body2" color="text.secondary">
                {`${Math.round(props.value)}%`}
            </Typography>
        </Box>
    </Box>
);

const Download = (props) => {
    const dispatch = useAppDispatch();
    const pageActive = useAppSelector(pageActiveStore);
    const downloadList = useAppSelector(downloadListStore);

    useEffect(() => {
        if (pageActive === "download") {
            init();
        }
    }, [pageActive]);

    const init = async () => {
        const res = await getAllDownloadList();
        dispatch(storeDownloadList({ downloadList: res, forceRefresh: true }));
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

    const getPercentage = (rowData) => {
        const percentageNum = rowData.count === 0 ? 0.0 : (_.divide(rowData.download_count, rowData.count) * 100);
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
        return status ? <Chip color={status.color} label={status.label} variant="outlined" /> : null;
    };

    const getStatus = (status) => {
        const statusMap = {
            parseSource: "解析资源",
            downloadSlice: "下载ts分片",
            checkSouce: "检测完整性",
            merger: "合并视频",
            downloadEnd: "下载结束",
        };
        return <Chip label={statusMap[status]} color={status === "downloadEnd" ? "success" : "primary"} variant="outlined" />;
    };

    const playEvent = (downloadInfo) => {
        const playInfo = {
            playState: "newPlay",
            playType: "localMovie",
            isLive: false,
            name: downloadInfo.movie_name,
            iptv: { channelGroupId: 0, channelActive: "" },
            download: { downloadId: downloadInfo.id },
            movie: { siteKey: "", ids: "", index: 0, videoFlag: "", onlineUrl: "" },
        };
        dispatch(updatePlayInfo({ playInfo, toPlay: true }));
    };

    const retryEvent = async (download) => {
        const save_path = await getDownloadSavePath();
        const downloadInfo = { ...download, download_status: "downloading", save_path };
        await invoke("retry_download", { download: downloadInfo });
    };

    const onDeleteDownload = async (download) => {
        await deleteDownload(download);
        init();
    };

    return (
        <div className={props.className ? `settingsPage ${props.className}` : "settingsPage"}>
            <TableContainer component={Paper}>
                <ThemeProvider theme={finalTheme}>
                    <Table sx={{ minWidth: 650 }} aria-label="下载表格">
                        <TableHead>
                            <TableRow>
                                <TableCell>影片名称</TableCell>
                                <TableCell sx={{ width: "50px" }}>子标题</TableCell>
                                <TableCell>状态</TableCell>
                                <TableCell sx={{ width: "200px" }}>下载进度</TableCell>
                                <TableCell>下载状态</TableCell>
                                <TableCell align="center">操作</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {downloadList.map((row) => (
                                <TableRow key={row.id} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                                    <TableCell component="th" scope="row">{row.movie_name}</TableCell>
                                    <TableCell>{row.sub_title_name}</TableCell>
                                    <TableCell>{getStatus(row.status)}</TableCell>
                                    <TableCell>
                                        <LinearProgressWithLabel value={getPercentage(row)} />
                                    </TableCell>
                                    <TableCell>{getDownloadStatus(row.download_status)}</TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={1}>
                                            {row.download_status === "downloadSuccess" && (
                                                <Button color="primary" size="small" onClick={() => playEvent(row)}>播放</Button>
                                            )}
                                            {row.status !== "downloadEnd" && (
                                                <Button color="warning" onClick={() => retryEvent(row)}>重试</Button>
                                            )}
                                            <Button color="error" onClick={() => onDeleteDownload(row)}>删除</Button>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ThemeProvider>
            </TableContainer>
        </div>
    );
};

export default Download;

