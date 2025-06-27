import React from 'react';
import { Modal, Button, QRCode } from 'antd';

/**
 * 二维码弹窗组件
 * @param {Object} props - 组件属性
 * @param {boolean} props.visible - 弹窗是否可见
 * @param {string} props.url - 要生成二维码的URL
 * @param {Function} props.onClose - 关闭弹窗的回调函数
 * @param {string} props.title - 弹窗标题，默认为"播放链接二维码"
 * @param {number} props.size - 二维码大小，默认为200
 * @param {string} props.description - 描述文字，默认为"扫描二维码在移动设备上继续观看"
 * @param {string} props.tip - 提示文字，默认为"链接有效期可能有限，请及时扫码"
 */
const QRCodeModal = ({
    visible,
    url,
    onClose,
    title = "播放链接二维码",
    size = 200,
    description = "扫描二维码在移动设备上继续观看",
    tip = "链接有效期可能有限，请及时扫码"
}) => {
    return (
        <Modal
            title={title}
            open={visible}
            onCancel={onClose}
            footer={[
                <Button key="close" onClick={onClose}>
                    关闭
                </Button>
            ]}
            centered
        >
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                padding: '20px' 
            }}>
                <p style={{ marginBottom: '20px' }}>{description}</p>
                {url && (
                    <QRCode
                        value={url}
                        size={size}
                        bordered={false}
                    />
                )}
                <p style={{ 
                    marginTop: '20px', 
                    fontSize: '12px', 
                    color: '#999' 
                }}>
                    {tip}
                </p>
            </div>
        </Modal>
    );
};

export default QRCodeModal;