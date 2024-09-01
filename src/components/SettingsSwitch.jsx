import { useState } from "react";
import styles from "./SettingsComponent.module.scss";

const SettingsSwitch = ({
    title= "",
    titleStyle= {},
    description= "",
    initValue= false,
    fieldKey= "",
    callback= undefined,
    value
}) => {
    const [switchValue, setSwitchValue] = useState(value)
    
    const switchChange = (switchValue) => {
        setSwitchValue(switchValue)
        if (callback) callback(switchValue)
    }

    return (
        <div className={styles.settingsItem}>
            <div className="left">
                <div className="title" style={titleStyle ? titleStyle : {}}> 
                    { title } 
                </div>
                {
                    description ?
                    <div className="description">
                        {description}
                    </div>
                    : ''
                }
            </div>
            <div className="right">
                <div className="toggle">
                    <input
                        id={fieldKey}
                        type="checkbox"
                        name={fieldKey}
                        checked={initValue}
                        onChange={(e) => switchChange(e.target.checked)}
                    />
                    <label htmlFor={fieldKey}></label>
                </div>
            </div>
        </div>
    )
}

export default SettingsSwitch;