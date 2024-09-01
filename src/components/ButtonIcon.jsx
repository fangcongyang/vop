import { CSSProperties, FunctionComponent, ReactElement } from 'react';
import "./ButtonIcon.scss";

const ButtonIcon = (props) => {
    return (
        <button
            title={props.title}
            style={props.style}
            className={props.className ? 'button ' + props.className : 'button'}
            onClick={props.onClick}>
            {props.children}
        </button>
    );
}

export default ButtonIcon;