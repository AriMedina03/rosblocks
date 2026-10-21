import { Button, Form, Input, message, Modal } from "antd";
import { ReactNode, useEffect, useState } from "react";
import "./styles.css";
import path from "path-browserify";

interface Props {
  children?: ReactNode;
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setWorkspaceLocationFromCreationDialog: React.Dispatch<
    React.SetStateAction<string>
  >;
  setValidWorkspace: React.Dispatch<React.SetStateAction<boolean>>;
}

function WorkspaceDialog(props: Props) {
  const {
    isModalOpen,
    setIsModalOpen,
    setWorkspaceLocationFromCreationDialog,
    setValidWorkspace,
  } = props;
  const [form] = Form.useForm();
  const [isInputChanged, setIsInputChanged] = useState(false);
  const [initialValues, setInitialValues] = useState({
    location: undefined,
    name: undefined,
  });

  const closeDialog = () => {
    setIsModalOpen(false);
    form.setFieldsValue({ location: undefined, name: undefined });
    form.resetFields();
    setIsInputChanged(false);
  };

  const handleOpenDialog = async () => {
    const selectedPath = await window.electronAPI.openWorkspaceLocation();
    if (selectedPath.workspaceLocation) {
      form.setFieldsValue({ location: selectedPath.workspaceLocation });
    }
  };

  const handleCreateWorkspace = async () => {
    try {
      await form.validateFields();

      const values = form.getFieldsValue();
      const workspacePath = path.join(
        values.location,
        `${new String(values.name).replace(" ", "_")}_ws`
      );
      const result = await window.electronAPI.createWorkspace(
        workspacePath.toLowerCase()
      );

      if (result.created) {
        const validateWorkspace = await window.electronAPI.validateWorkspace(
          result.workspacePath
        );
        setWorkspaceLocationFromCreationDialog(result.workspacePath);
        setValidWorkspace(validateWorkspace.valid);

        message.success("¡Workspace creado y build completado!");
        closeDialog();
      } else {
        message.error(result.error);
      }
    } catch (error) {
      if (error instanceof Error) {
        message.error(`¡Ocurrió un error al crear el workspace! ${error.message}`);
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
  }, [isModalOpen, form]);

  return (
    <>
      <Modal
        title="Crear un nuevo workspace"
        open={isModalOpen}
        centered
        maskClosable={false}
        onCancel={closeDialog}
        footer={[
          <Button
            key="save"
            type="primary"
            htmlType="submit"
            form="workspace"
            disabled={!isInputChanged}
            onClick={handleCreateWorkspace}
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
          id="workspace"
          onFieldsChange={handleFieldsChange}
        >
          <Form.Item
            label="Ubicación de la carpeta"
            name="location"
            rules={[{ required: true, message: "Elige la ubicación de la carpeta" }]}
          >
            <Input
              readOnly
              onClick={handleOpenDialog}
              placeholder="Elige la ubicación del Workspace"
            />
          </Form.Item>
          <Form.Item
            label="Nombre del workspace"
            name="name"
            rules={[{ required: true, message: "Elige el nombre de la carpeta" }]}
          >
            <Input addonAfter="_ws" placeholder="Define el nombre del Workspace" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default WorkspaceDialog;
