import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Form, message, Tabs } from 'antd';
import { LockOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { useConfig } from '@/hooks/useConfig';
import CryptoJS from 'crypto-js';
import './AppLock.scss';

const { TabPane } = Tabs;

const AppLock = ({ visible, onUnlock }) => {
    const [form] = Form.useForm();
    const [recoveryForm] = Form.useForm();
    const [activeTab, setActiveTab] = useState('unlock');
    const [loading, setLoading] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [isLocked, setIsLocked] = useState(false);

    // 配置项
    const [appLockEnabled] = useConfig('appLockEnabled', false);
    const [passwordHash] = useConfig('appLockPasswordHash', '');
    const [passwordSalt] = useConfig('appLockPasswordSalt', '');
    const [securityQuestions] = useConfig('appLockSecurityQuestions', []);
    const [securityAnswers] = useConfig('appLockSecurityAnswers', []);

    // 生成密码哈希
    const generatePasswordHash = (password, salt) => {
        return CryptoJS.PBKDF2(password, salt, {
            keySize: 256/32,
            iterations: 10000
        }).toString();
    };

    // 验证密码
    const verifyPassword = (password) => {
        const hash = generatePasswordHash(password, passwordSalt);
        return hash === passwordHash;
    };

    // 处理密码解锁
    const handleUnlock = async (values) => {
        setLoading(true);

        try {
            if (verifyPassword(values.password)) {
                message.success('解锁成功');
                setAttempts(0);
                onUnlock();
            } else {
                const newAttempts = attempts + 1;
                setAttempts(newAttempts);

                if (newAttempts >= 5) {
                    setIsLocked(true);
                    message.error('密码错误次数过多，请使用找回密码功能');
                    setActiveTab('recovery');
                } else {
                    message.error(`密码错误，还有 ${5 - newAttempts} 次机会`);
                }
            }
        } catch {
            message.error('验证失败，请重试');
        } finally {
            setLoading(false);
            form.resetFields();
        }
    };

    // 处理找回密码
    const handleRecovery = async (values) => {
        setLoading(true);

        try {
            // 验证安全问题答案
            let allCorrect = true;
            for (let i = 0; i < securityQuestions.length; i++) {
                const userAnswer = values[`answer${i}`]?.toLowerCase().trim();
                const correctAnswer = securityAnswers[i]?.toLowerCase().trim();
                if (userAnswer !== correctAnswer) {
                    allCorrect = false;
                    break;
                }
            }

            if (allCorrect) {
                message.success('验证成功，应用已解锁');
                setAttempts(0);
                setIsLocked(false);
                onUnlock();
            } else {
                message.error('安全问题答案错误');
            }
        } catch {
            message.error('验证失败，请重试');
        } finally {
            setLoading(false);
            recoveryForm.resetFields();
        }
    };

    // 重置锁定状态
    useEffect(() => {
        if (visible) {
            setAttempts(0);
            setIsLocked(false);
            setActiveTab('unlock');
        }
    }, [visible]);

    if (!appLockEnabled || !passwordHash) {
        return null;
    }

    return (
        <Modal
            title={null}
            open={visible}
            footer={null}
            closable={false}
            maskClosable={false}
            centered
            width={400}
            className="app-lock-modal"
        >
            <div className="app-lock-container">
                <div className="lock-header">
                    <LockOutlined className="lock-icon" />
                    <h2>应用已锁定</h2>
                    <p>请输入密码解锁应用</p>
                </div>

                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    centered
                    className="lock-tabs"
                >
                    <TabPane tab="密码解锁" key="unlock" disabled={isLocked}>
                        <Form
                            form={form}
                            onFinish={handleUnlock}
                            layout="vertical"
                            className="unlock-form"
                        >
                            <Form.Item
                                name="password"
                                rules={[
                                    { required: true, message: '请输入密码' }
                                ]}
                            >
                                <Input.Password
                                    placeholder="请输入应用密码"
                                    size="large"
                                    iconRender={(visible) =>
                                        visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                                    }
                                    onPressEnter={() => form.submit()}
                                />
                            </Form.Item>

                            <Form.Item>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={loading}
                                    size="large"
                                    block
                                >
                                    解锁应用
                                </Button>
                            </Form.Item>

                            {attempts > 0 && (
                                <div className="attempts-warning">
                                    密码错误 {attempts} 次，还有 {5 - attempts} 次机会
                                </div>
                            )}
                        </Form>
                    </TabPane>

                    <TabPane tab="找回密码" key="recovery">
                        <Form
                            form={recoveryForm}
                            onFinish={handleRecovery}
                            layout="vertical"
                            className="recovery-form"
                        >
                            <div className="recovery-description">
                                请回答以下安全问题来重置密码：
                            </div>

                            {securityQuestions.map((question, index) => (
                                <Form.Item
                                    key={index}
                                    label={`问题 ${index + 1}: ${question}`}
                                    name={`answer${index}`}
                                    rules={[
                                        { required: true, message: '请回答此问题' }
                                    ]}
                                >
                                    <Input
                                        placeholder="请输入答案"
                                        size="large"
                                    />
                                </Form.Item>
                            ))}

                            <Form.Item>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={loading}
                                    size="large"
                                    block
                                >
                                    验证并解锁
                                </Button>
                            </Form.Item>
                        </Form>
                    </TabPane>
                </Tabs>
            </div>
        </Modal>
    );
};

export default AppLock;
