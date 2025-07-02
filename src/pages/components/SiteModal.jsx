import React, { useEffect } from "react";
import { Button, Modal, Form, Select, Input } from "antd";

const { useForm } = Form;

const SiteModal = ({ siteInfo, open, onClose, onSubmit }) => {
  const [form] = useForm();

  useEffect(() => {
    resetFormValue();
  }, [siteInfo]);

  const resetFormValue = () => {
    if (siteInfo.site_group) {
        form.setFieldsValue({
          siteGroup: siteInfo.site_group,
          siteKey: siteInfo.site_key,
          siteName: siteInfo.site_name,
          api: siteInfo.api,
          parseMode: siteInfo.parse_mode,
        });
      } else {
        form.setFieldsValue({
          siteGroup: "影视",
          siteKey: "",
          siteName: "",
          api: "",
          parseMode: "xml",
        });
      }
  }

  const handleSubmit = (values) => {
    const id = siteInfo?.id || undefined;
    onSubmit({id, ...values});
    handleClose();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={(siteInfo && siteInfo.id ? "编辑" : "新增") + "站点"}
      footer={null}
    >
      <Form
        form={form}
        name="basic"
        labelCol={{
          span: 4,
        }}
        wrapperCol={{
          span: 20,
        }}
        style={{
          maxWidth: 600,
        }}
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          label="站点分组"
          name="siteGroup"
          rules={[
            {
              required: true,
              message: "请选择站点分组",
            },
          ]}
        >
          <Select>
            <Select.Option value="影视">影视</Select.Option>
            <Select.Option value="18+">18+</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item
          label="站点编码"
          name="siteKey"
          rules={[
            {
              required: true,
              message: "请输入站点编码",
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="站点名称"
          name="siteName"
          rules={[
            {
              required: true,
              message: "请输入站点名称",
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="api"
          name="api"
          rules={[
            {
              required: true,
              message: "请输入api",
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="解析模式"
          name="parseMode"
          rules={[
            {
              required: true,
              message: "请选择解析模式",
            },
          ]}
        >
          <Select>
            <Select.Option value="xml">xml</Select.Option>
            <Select.Option value="json">json</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label={null}>
          <Button type="primary" htmlType="submit">
            提交
          </Button>
          <Button onClick={resetFormValue}>重置</Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SiteModal;
