import { Button, Form, Input, message, Modal } from "antd";
import { useEffect, useState } from "react";

interface Props {
  packageLocation: string;
  packageName: string;
  packageType: string;
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setNodes: React.Dispatch<React.SetStateAction<ROSNode[]>>;
}

function NodeDialog(props: Props) {
  const [form] = Form.useForm();
  const {
    isModalOpen,
    packageLocation,
    packageName,
    packageType,
    setIsModalOpen,
    setNodes,
  } = props;
  const [isInputChanged, setIsInputChanged] = useState(false);
  const [initialValues, setInitialValues] = useState({
    name: undefined,
    location: packageLocation,
    nodeType: packageType,
  });

  const closeDialog = () => {
    setIsModalOpen(false);
    form.resetFields();
    form.setFieldsValue({
      name: undefined,
      location: packageLocation,
      nodeType: packageType,
    });
    setIsInputChanged(false);
  };

  const handleCreateNode = async () => {
    try {
      await form.validateFields();
      const nodeName: string = form.getFieldValue("name");
      const result = await window.electronAPI.createNode(
        nodeName.toLowerCase(),
        packageType,
        packageLocation,
        packageName
      );

      if (result.created) {
        closeDialog();
        fetchNodes();
      } else {
        message.error(result.error);
      }
    } catch (error) {
      if (error instanceof Error) {
        message.error(`¡Ocurrió un error al crear el nodo!`);
      }
    }
  };

  const handleFieldsChange = () => {
    const currentValues = form.getFieldsValue();
    const nameValue = String(form.getFieldValue("name"));
    const isChanged =
      JSON.stringify(currentValues) !== JSON.stringify(initialValues);
    setIsInputChanged(isChanged && nameValue.length > 0);
  };

  useEffect(() => {
    if (isModalOpen) {
      const currentValues = form.getFieldsValue();
      setInitialValues(currentValues);
    }
  }, [form, isModalOpen, packageLocation]);

  const fetchNodes = async () => {
    const result = await window.electronAPI.getNodes(
      packageLocation,
      packageName
    );
    setNodes(result);
  };

  return (
    <>
      <Modal
        title="Crear un nuevo nodo"
        open={isModalOpen}
        centered
        maskClosable={false}
        onCancel={closeDialog}
        footer={[
          <Button
            key="save"
            type="primary"
            htmlType="submit"
            form="package"
            disabled={!isInputChanged}
            onClick={handleCreateNode}
          >
            Crear
          </Button>,
          <Button key="cancel" type="default" onClick={closeDialog}>
            Cancelar
          </Button>,
        ]}
      >
        <Form
          layout="vertical"
          form={form}
          id="package"
          onFieldsChange={handleFieldsChange}
          initialValues={initialValues}
        >
          <Form.Item
            label="Nombre del nodo"
            name="name"
            rules={[
              {
                required: true,
                message: "Es obligatorio elegir el nombre del nodo",
              },
            ]}
          >
            <Input placeholder="Elige el nombre del nodo" />
          </Form.Item>
          <Form.Item
            label="Ubicación del nodo"
            name="location"
            rules={[
              {
                required: true,
                message: "Es obligatorio elegir la ubicación del nodo",
              },
            ]}
          >
            <Input
              readOnly
              placeholder="Elige la ubicación del nodo"
              value={packageLocation}
            />
          </Form.Item>
          <Form.Item
            label="Tipo de nodo"
            name="nodeType"
            rules={[
              {
                required: true,
                message: "Es obligatorio elegir el tipo de nodo",
              },
            ]}
          >
            <Input
              readOnly
              placeholder="Elige el tipo de nodo"
              value={packageType}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default NodeDialog;
