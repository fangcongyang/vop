import { size } from 'lodash';
import { useMemo } from 'react';

const SvgIcon = ({name, title, color, style, className, size = 24}) => {

    const getStyle = useMemo(() => {
        if (style && style.width) {
            return style;
        }
        let s = `${size}`;
        s = `${s.replace('px', '')}px`;
        return {
            width: s,
            height: s,
            ...style
        };
    }, [size]);

    return (
        <svg style={getStyle} className={className ? 'svg-icon ' + className : 'svg-icon'}>
            { title ? <title>{title}</title> : '' }
            <use xlinkHref={'#icon-' + name} fill={color} />
        </svg>
    );
}

export default SvgIcon;