import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { isString } from "lodash";
import styles from "./SettingsComponent.module.scss";

const SettingsInput = ({
        title= "",
        titleStyle= {},
        description= "",
        initValue= "",
        inputPlaceholder= "",
        callback= undefined
}) => {
    const { t } = useTranslation();
    const [inputValue, setInputValue] = useState(initValue);
    
    const inputBlur = () => {
        if (initValue === inputValue) return;
        if (callback) callback(inputValue)
    }

    return (
        <div className={styles.settingsItem}>
            <div className="left">
                <div className="title" style={titleStyle ? titleStyle : {}}> 
                    { isString(title) ? t(title) : title } 
                </div>
                {
                    description ?
                    <div className="description">
                        { isString(description) ? t(description) : description }
                    </div>
                    : ''
                }
            </div>
            <div className="right">
                <input
                    className="text-input margin-right-0"
                    placeholder={inputPlaceholder}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onBlur={inputBlur}
                />
            </div>
        </div>
    )
}

export default SettingsInput;