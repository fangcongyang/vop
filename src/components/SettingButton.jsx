import { open } from "@tauri-apps/plugin-dialog";
import styles from "./SettingsComponent.module.scss";

const SettingsInput = ({
    title = "",
    titleStyle = {},
    description = "",
    type = "button",
    initValue = "",
    placeholder = "",
    callback= undefined,
}) => {
    const buttonClick = async () => {
        if (type == "selectDir") {
            const selected = await open({
                directory: true,
                defaultPath: initValue,
            });
            if (selected) {
                if (initValue === selected) return;
                if (callback) callback(selected);
            }
        } else {
            callback();
        }
    };

    return (
        <div className={styles.settingsItem}>
            <div className="left">
                <div className="title" style={titleStyle ? titleStyle : {}}>
                    {title}
                </div>
                {description ? (
                    <div className="description">{description}</div>
                ) : (
                    ""
                )}
            </div>
            <div className="right">
                <button onClick={() => buttonClick()}>{placeholder}</button>
            </div>
        </div>
    );
};

export default SettingsInput;
