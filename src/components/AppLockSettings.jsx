import React, { useState } from 'react';
import { Modal, Input, Button, Form, message, Steps, Space, Divider } from 'antd';
import { LockOutlined, EyeInvisibleOutlined, EyeTwoTone, SafetyOutlined } from '@ant-design/icons';
import { useConfig } from '@/hooks/useConfig';
import CryptoJS from 'crypto-js';
import './AppLockSettings.scss';

const { Step } = Steps;

const AppLockSettings = ({ visible, onClose }) => {
    const [form] = Form.useForm();
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [passwordData, setPasswordData] = useState(null);

    // 配置项
    const [, setAppLockEnabled] = useConfig('appLockEnabled', false);
    const [, setPasswordHash] = useConfig('appLockPasswordHash', '');
    const [, setPasswordSalt] = useConfig('appLockPasswordSalt', '');
    const [, setSecurityQuestions] = useConfig('appLockSecurityQuestions', []);
    const [, setSecurityAnswers] = useConfig('appLockSecurityAnswers', []);

    // 默认安全问题
    const defaultQuestions = [
        '您的第一个宠物的名字是什么？',
        '您母亲的姓名是什么？',
        '您最喜欢的电影是什么？'
    ];

    // 生成随机盐
    const generateSalt = () => {
        return CryptoJS.lib.WordArray.random(128/8).toString();
    };

    // 生成密码哈希
    const generatePasswordHash = (password, salt) => {
        return CryptoJS.PBKDF2(password, salt, {
            keySize: 256/32,
            iterations: 10000
        }).toString();
    };

    // 验证密码强度
    const validatePasswordStrength = (password) => {
        if (password.length < 6) {
            return { valid: false, message: '密码长度至少6位' };
        }
        if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
            return { valid: false, message: '密码必须包含字母和数字' };
        }
        return { valid: true, message: '密码强度良好' };
    };

    // 处理密码设置
    const handlePasswordStep = async (values) => {
        const { password, confirmPassword } = values;

        if (password !== confirmPassword) {
            message.error('两次输入的密码不一致');
            return;
        }

        const validation = validatePasswordStrength(password);
        if (!validation.valid) {
            message.error(validation.message);
            return;
        }

        const salt = generateSalt();
        const hash = generatePasswordHash(password, salt);

        setPasswordData({ hash, salt });
        setCurrentStep(1);
        form.resetFields();
    };

    // 处理安全问题设置
    const handleSecurityStep = async (values) => {
        setLoading(true);

        try {
            const questions = [
                values.question1 || defaultQuestions[0],
                values.question2 || defaultQuestions[1],
                values.question3 || defaultQuestions[2]
            ];

            const answers = [
                values.answer1?.trim(),
                values.answer2?.trim(),
                values.answer3?.trim()
            ];

            // 验证答案不为空
            if (answers.some(answer => !answer)) {
                message.error('请填写所有安全问题的答案');
                return;
            }

            // 保存配置
            await setPasswordHash(passwordData.hash);
            await setPasswordSalt(passwordData.salt);
            await setSecurityQuestions(questions);
            await setSecurityAnswers(answers);
            await setAppLockEnabled(true);

            message.success('应用锁设置成功！');
            handleClose();
        } catch {
            message.error('设置失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    // 关闭弹窗
    const handleClose = () => {
        setCurrentStep(0);
        setPasswordData(null);
        form.resetFields();
        onClose();
    };

    // 上一步
    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    return (
        <Modal
            title="设置应用锁"
            open={visible}
            onCancel={handleClose}
            footer={null}
            width={600}
            className="app-lock-settings-modal"
        >
            <div className="app-lock-settings-container">
                <Steps current={currentStep} className="setup-steps">
                    <Step title="设置密码" icon={<LockOutlined />} />
                    <Step title="安全问题" icon={<SafetyOutlined />} />
                </Steps>

                <Divider />

                {currentStep === 0 && (
                    <div className="password-step">
                        <div className="step-header">
                            <h3>设置应用密码</h3>
                            <p>请设置一个安全的密码来保护您的应用</p>
                        </div>

                        <Form
                            form={form}
                            onFinish={handlePasswordStep}
                            layout="vertical"
                            className="password-form"
                        >
                            <Form.Item
                                label="应用密码"
                                name="password"
                                rules={[
                                    { required: true, message: '请输入密码' },
                                    { min: 6, message: '密码长度至少6位' },
                                    {
                                        pattern: /(?=.*[a-zA-Z])(?=.*\d)/,
                                        message: '密码必须包含字母和数字'
                                    }
                                ]}
                            >
                                <Input.Password
                                    placeholder="请输入密码（至少6位，包含字母和数字）"
                                    size="large"
                                    iconRender={(visible) =>
                                        visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                                    }
                                />
                            </Form.Item>

                            <Form.Item
                                label="确认密码"
                                name="confirmPassword"
                                rules={[
                                    { required: true, message: '请确认密码' }
                                ]}
                            >
                                <Input.Password
                                    placeholder="请再次输入密码"
                                    size="large"
                                    iconRender={(visible) =>
                                        visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                                    }
                                />
                            </Form.Item>

                            <div className="password-tips">
                                <h4>密码要求：</h4>
                                <ul>
                                    <li>长度至少6位字符</li>
                                    <li>必须包含字母和数字</li>
                                    <li>建议使用特殊字符增强安全性</li>
                                </ul>
                            </div>

                            <Form.Item>
                                <Space className="step-buttons">
                                    <Button onClick={handleClose}>取消</Button>
                                    <Button type="primary" htmlType="submit" size="large">
                                        下一步
                                    </Button>
                                </Space>
                            </Form.Item>
                        </Form>
                    </div>
                )}

                {currentStep === 1 && (
                    <div className="security-step">
                        <div className="step-header">
                            <h3>设置安全问题</h3>
                            <p>设置安全问题用于找回密码，请确保答案只有您知道</p>
                        </div>

                        <Form
                            form={form}
                            onFinish={handleSecurityStep}
                            layout="vertical"
                            className="security-form"
                            initialValues={{
                                question1: defaultQuestions[0],
                                question2: defaultQuestions[1],
                                question3: defaultQuestions[2]
                            }}
                        >
                            {[1, 2, 3].map((num) => (
                                <div key={num} className="question-group">
                                    <Form.Item
                                        label={`安全问题 ${num}`}
                                        name={`question${num}`}
                                        rules={[
                                            { required: true, message: '请输入安全问题' }
                                        ]}
                                    >
                                        <Input
                                            placeholder={`请输入第${num}个安全问题`}
                                            size="large"
                                        />
                                    </Form.Item>

                                    <Form.Item
                                        label={`问题 ${num} 答案`}
                                        name={`answer${num}`}
                                        rules={[
                                            { required: true, message: '请输入答案' },
                                            { min: 2, message: '答案长度至少2位' }
                                        ]}
                                    >
                                        <Input
                                            placeholder="请输入答案（不区分大小写）"
                                            size="large"
                                        />
                                    </Form.Item>
                                </div>
                            ))}

                            <div className="security-tips">
                                <h4>安全提示：</h4>
                                <ul>
                                    <li>请设置只有您知道的问题和答案</li>
                                    <li>答案验证时不区分大小写</li>
                                    <li>建议使用不易被他人猜到的答案</li>
                                    <li>请牢记您的答案，这是找回密码的唯一方式</li>
                                </ul>
                            </div>

                            <Form.Item>
                                <Space className="step-buttons">
                                    <Button onClick={handlePrevious}>上一步</Button>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={loading}
                                        size="large"
                                    >
                                        完成设置
                                    </Button>
                                </Space>
                            </Form.Item>
                        </Form>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default AppLockSettings;
