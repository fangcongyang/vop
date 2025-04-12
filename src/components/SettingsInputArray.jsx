import { useState } from "react";
import { CloseOutlined } from '@ant-design/icons';
import "./SettingsInputArray.scss";

const SettingsInputArray = ({
    title= "",
    titleStyle= {},
    description= "",
    initValue= "",
    fieldKey= "",
    inputPlaceholder= "",
    callback= undefined
}) => {
    const [inputValue, setInputValue] = useState("");

    const inputKeyDown = (e) => {
        if (!inputValue) return;
        if (e.code === "Enter") {
            let newValue = [...initValue, inputValue];
            if (callback) callback(newValue)
            setInputValue("");
        }
    }

    const removeValue = (value) => {
        let newValue = initValue.filter(item => item !== value);
        if (callback) callback(newValue)
    }

    return (
        <div className="settingsInputArray">
            <div className="up">
                <div className="title" style={titleStyle ? titleStyle : {}}>
                    {title}
                </div>
                <input
                    className="text-input margin-right-0"
                    placeholder={inputPlaceholder}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={inputKeyDown}
                />
            </div >
            <div className="down">
                <div className="description">
                    <div className="tags">
                        {
                            initValue.map((rootFilter, index) => {
                                return (<div key={index} className="tag">{rootFilter}
                                    <CloseOutlined
                                        className="close"
                                        onClick={() => {removeValue(rootFilter)}} />
                                </div>)
                            })
                        }
                    </div>
                </div>
            </div>
        </div >
    )
}

export default SettingsInputArray;