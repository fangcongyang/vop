import React, { useState, useEffect } from "react";
import { Modal, Button, Flex, Progress } from "antd"; // 使用antd的Modal、Button、Space和Progress组件
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import styles from "./UpdateModal.module.scss";
import { invoke } from "@tauri-apps/api/core";
import { marked } from "marked";

const UpdateModal = ({
  show,
  currentVersion,
  onClose,
}) => {
  const [latestVersion, setLatestVersion] = useState("");
  const [body, setBody] = useState("");
  const [isStarted, setIsStarted] = useState(false); // Add isStarted
  const [progress, setProgress] = useState(0); // Add progres

  useEffect(() => {
    invoke("github_repos_info_version", {
      owner: "fangcongyang",
      repo: "vop",
    }).then((githubLatestReleaseInfo) => {
      if (!githubLatestReleaseInfo) {
        setBody(marked.parse("# 获取最新版本信息失败"));
        return;
      }
      setLatestVersion(githubLatestReleaseInfo.tag_name);
      // 手动处理换行符，然后解析Markdown
      // 先将连续的多个换行符转换为单个换行符，再添加Markdown换行语法
      let bodyWithBreaks = githubLatestReleaseInfo.body.replace(/"/g, '');
      bodyWithBreaks = bodyWithBreaks
        .replace(/\\n+/g, '\\n')  // 将连续的多个\n转换为单个\n
        .replace(/\\n/g, '\n'); // 添加Markdown强制换行语法
      setBody(marked.parse(bodyWithBreaks));
    });
  }, []);

  if (!show) {
    return null;
  }

  const doUpdate = async () => {
    const update = await check();
    setIsStarted(true);
    if (update) {
      let downloaded = 0;
      let contentLength = 0;
      // alternatively we could also call update.download() and update.install() separately
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength;
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            setProgress(
              parseFloat(((downloaded / contentLength) * 100).toFixed(2))
            );
            break;
          case "Finished":
            setIsStarted(false);
            break;
        }
      });

      await relaunch();
    }
  };

  return (
    <Modal
      title="检查更新"
      open={show}
      onCancel={onClose}
      maskClosable={false}
      footer={null}
      className={styles.updateModal}
    >
      <h2>
        新版本:{latestVersion}
      </h2>
      <div className={styles.changelog}>
        <h3>更新日志</h3>
        <div dangerouslySetInnerHTML={{ __html: body }} />
      </div>
      <Flex>
        {isStarted && (
              <Progress style={{ width: '100%' }} percent={progress} status="active" />
        )}
      </Flex>
      <div className={styles.actions}>
        {latestVersion !== `v${currentVersion}` && !isStarted && (
          <Button type="primary" onClick={doUpdate}>
            立即更新
          </Button>
        )}
        <Button onClick={onClose}>
          取消
        </Button>
      </div>
    </Modal>
  );
};

export default UpdateModal;
