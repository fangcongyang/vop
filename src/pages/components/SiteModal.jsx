import React, { useEffect, useState } from "react";
import {
    Modal,
    TextField,
    Button,
    Grid,
    styled,
    Box,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
} from "@mui/material";

const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 400,
    bgcolor: "background.paper",
    pt: 2,
    px: 4,
    pb: 3,
};

const SiteModal = ({ siteInfo, open, onClose, onSubmit }) => {
    const [siteGroup, setSiteGroup] = useState("影视");
    const [siteKey, setSiteKey] = useState("");
    const [siteName, setSiteName] = useState("");
    const [api, setApi] = useState("");
    const [parseMode, setParseMode] = useState("xml");

    useEffect(() => {
        if (siteInfo.site_group) {
            setSiteGroup(siteInfo.site_group)
            setSiteKey(siteInfo.site_key)
            setSiteName(siteInfo.site_name)
            setApi(siteInfo.api)
            setParseMode(siteInfo.parse_mode)
        } else {
            setSiteGroup("影视");
            setSiteKey("");
            setSiteName("");
            setApi("");
            setParseMode("xml");
        }
    }, [siteInfo]);

    const handleSubmit = (event) => {
        event.preventDefault();
        onSubmit({ id: siteInfo.id, siteGroup, siteKey, siteName, api, parseMode });
        handleClose();
    };

    const handleClose = () => {
        onClose();
    };

    return (
        <Modal
            open={open}
            onClose={handleClose}
            aria-labelledby="site-modal-title"
            aria-describedby="site-modal-description"
        >
            <Box sx={{ ...style, width: 400 }}>
                <h4 id="site-modal-title" className="mb-4">{ (siteInfo && siteInfo.id ? "编辑" : "新增") + "站点"}</h4>
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={2}>
                        <Grid item xs={24}>
                            <FormControl
                                sx={{ width: "100%" }}
                                size="small"
                                required
                            >
                                <InputLabel id="site-group-small-label">
                                    站点分组
                                </InputLabel>
                                <Select
                                    labelId="site-group-small-label"
                                    id="site-group-small"
                                    value={siteGroup}
                                    onChange={(e) =>
                                        setSiteGroup(e.target.value)
                                    }
                                    label="站点分组"
                                    size="small"
                                    sx={{ width: "100%" }}
                                >
                                    <MenuItem value={"影视"}>影视</MenuItem>
                                    <MenuItem value={"18+"}>18+</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="站点编码"
                                value={siteKey}
                                onChange={(e) => setSiteKey(e.target.value)}
                                size="small"
                                sx={{ width: "100%" }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="站点名称"
                                value={siteName}
                                onChange={(e) => setSiteName(e.target.value)}
                                size="small"
                                sx={{ width: "100%" }}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="api"
                                value={api}
                                onChange={(e) => setApi(e.target.value)}
                                size="small"
                                sx={{ width: "100%" }}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl sx={{ width: "100%" }} size="small">
                                <InputLabel id="parse-mode-small-label">
                                    解析模式
                                </InputLabel>
                                <Select
                                    labelId="parse-mode-small-label"
                                    id="parse-mode-small"
                                    value={parseMode}
                                    onChange={(e) =>
                                        setParseMode(e.target.value)
                                    }
                                    label="解析模式"
                                    size="small"
                                    sx={{ width: "100%" }}
                                    required
                                >
                                    <MenuItem value={"xml"}>xml</MenuItem>
                                    <MenuItem value={"json"}>json</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <Button
                                type="submit"
                                variant="contained"
                                color="primary"
                            >
                                提交
                            </Button>
                        </Grid>
                    </Grid>
                </form>
            </Box>
        </Modal>
    );
};

export default SiteModal;
