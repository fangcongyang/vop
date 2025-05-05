import { isString } from "lodash";
import styles from "./SettingsComponent.module.scss";

const SettingsSelect = ({
    title= "",
    initValue= "",
    selectData= [],
    converNumber= false,
    callback= undefined
}) => {
    
    const selectChange = (selectValue) => {
        if (converNumber && isString(selectValue)) {
            selectValue = parseInt(selectValue, 10);
        }
        if (callback) callback(selectValue)
    }

    return (
        <div className={styles.settingsItem}>
            <div className="left">
                <div className="title"> {title} </div>
            </div>
            <div className="right">
                <select value={initValue} onChange={ (e) => selectChange(e.target.value) } >
                    {
                        selectData.map((sd) => {
                            return <option key={sd.value} value={sd.value}>{sd.name}</option>;
                        })
                    }
                </select>
            </div>
        </div>
    )
}

export default SettingsSelect;