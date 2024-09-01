import { createRoot } from 'react-dom/client';
import Message from './Message';

class MessageDom {

    constructor(type, ...data) {
        if (!data) {
            throw new Error("参数为空")
        }
        let content, duration;
        if (typeof data[0] === 'object') {
            [content, duration] = [...data[0]]
        } else if (typeof data[0] === 'string') {
            content = data[0]
        } else if (data.length == 2 && typeof data[1] === 'number') {
            duration = data[1];
        }

        if (!duration || duration < 3000) {
            duration = 3000;
        }
        this.dom = document.createElement('div');
        const JSX = <Message content={content} duration={duration} type={type} onClose={() => this.destroy()}></Message>;
        createRoot(this.dom).render(JSX);
        document.body.appendChild(this.dom);
    }

    destroy() {
        if (document.body.contains(this.dom)) {
            document.body.removeChild(this.dom);
        }
    }
}

const message = {
    success(...data) {
        new MessageDom("success", data);
    },
    error(...data) {
        new MessageDom("error", data);
    },
    warning(...data) {
        new MessageDom("warning", data);
    },
    info(...data) {
        new MessageDom("info", data);
    }
};

export default message;