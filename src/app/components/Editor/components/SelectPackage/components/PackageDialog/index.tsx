import { Button, Form, Input, message, Modal, Radio, Result } from "antd";
import "./styles.css";
import { useEffect, useState } from "react";
import { CheckboxGroupProps } from "antd/es/checkbox";

interface Props {
  packageLocation: string;
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setPackages: React.Dispatch<React.SetStateAction<Package[]>>;
}
const options: CheckboxGroupProps<string>["options"] = [
  { label: "Python", value: "rclpy" },
  { label: "C++", value: "rclcpp", disabled: true },
];

function PackageDialog(props: Props) {
  const [createForm] = Form.useForm();
  const [importForm] = Form.useForm();
  const { packageLocation, isModalOpen, setIsModalOpen, setPackages } = props;
  const [isInputChanged, setIsInputChanged] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [packageDependency, setPackageDependency] = useState("rclpy");
  const [initialValues, setInitialValues] = useState({
    location: packageLocation,
    name: undefined,
    type: packageDependency,
    dependency: packageDependency,
  });

  const ADD_PKG_TITLE = "Importar o agregar un nuevo paquete";
  const ADD_PKG_SUBTITLE =
    "Puedes crear un nuevo paquete o importar un paquete ROS2 mediante una URL de GitHub";
  const IMPORT_BUTTON_TITLE = "Importar";
  const CREATE_BUTTON_TITLE = "Crear";

  const closeDialog = () => {
    setIsModalOpen(false);
    createForm.resetFields();
    importForm.resetFields();
    createForm.setFieldsValue({
      location: packageLocation,
      name: undefined,
      type: "rclpy",
      dependency: "rclpy",
    });
    setPackageDependency("rclpy");
    setIsInputChanged(false);
    setShowCreateForm(false);
    setShowImportForm(false);
  };

  const fetchPackages = async () => {
    const result = await window.electronAPI.getPackages(packageLocation);
    setPackages(result);
  };

  const handleCreatePackage = async () => {
    try {
      await createForm.validateFields();

      const packageName: string = createForm.getFieldValue("name");
      const packageDeps: string = createForm.getFieldValue("dependency");
      const result = await window.electronAPI.createPackage(
        packageLocation,
        packageName.toLowerCase(),
        packageDeps.toLowerCase()
      );

      if (result.created) {
        message.success("¡Package creado con éxito!");
        closeDialog();
        fetchPackages();
      } else if (result.error) {
        const errorMessage =
          typeof result.error === "string"
            ? result.error
            : JSON.stringify(result.error);
        message.error(`Error al crear el paquete: ${errorMessage}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        message.error(`¡Ocurrió un error al crear el paquete!`);
      }
    }
  };

  const handleFieldsChange = () => {
    const currentValues = createForm.getFieldsValue();
    const nameValue = String(createForm.getFieldValue("name"));
    const isChanged =
      JSON.stringify(currentValues) !== JSON.stringify(initialValues);
    setIsInputChanged(isChanged && nameValue.length > 0);
  };

  const handleFieldsChangeOnImport = () => {
    const urlValue = String(importForm.getFieldValue("url"));
    setIsInputChanged(urlValue.length > 0 ? true : false);
  };

  const handleImportPackage = async () => {
    try {
      await importForm.validateFields();
      const packageUrl: string = importForm.getFieldValue("url");
      const result = await window.electronAPI.importPackage(
        packageUrl,
        packageLocation
      );

      if (result.imported) {
        message.success("¡Package importado con éxito!");
        closeDialog();
        fetchPackages();
      } else if (result.error) {
        const errorMessage =
          typeof result.error === "string"
            ? result.error
            : JSON.stringify(result.error);
        message.error(`Error al importar el paquete: ${errorMessage}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        message.error(`¡Ocurrió un error al importar el paquete!`);
      }
    }
  };

  useEffect(() => {
    if (isModalOpen) {
      const currentValues = createForm.getFieldsValue();
      setInitialValues(currentValues);
    }

    createForm.setFieldsValue({
      dependency: packageDependency,
    });
  }, [createForm, isModalOpen, packageDependency, packageLocation]);

  return (
    <>
      <Modal
        title="Agregar un nuevo package"
        open={isModalOpen}
        centered
        maskClosable={false}
        onCancel={closeDialog}
        footer={
          showCreateForm || showImportForm
            ? [
                <Button
                  key="save"
                  type="primary"
                  htmlType="submit"
                  form={showCreateForm ? "packageCreate" : "packageImport"}
                  disabled={!isInputChanged}
                  onClick={
                    showCreateForm ? handleCreatePackage : handleImportPackage
                  }
                >
                  {showCreateForm ? "Crear" : "Importar"}
                </Button>,
                <Button key="cancel" type="default" onClick={closeDialog}>
                  Cancelar
                </Button>,
              ]
            : null
        }
      >
        {!showCreateForm && !showImportForm ? (
          <Result
            status="info"
            title={ADD_PKG_TITLE}
            subTitle={ADD_PKG_SUBTITLE}
            extra={[
              <>
                <Button
                  type="primary"
                  onClick={() => {
                    setShowImportForm(!showImportForm);
                  }}
                >
                  {IMPORT_BUTTON_TITLE}
                </Button>
                <Button
                  type="primary"
                  color="green"
                  variant="solid"
                  onClick={() => setShowCreateForm(!showCreateForm)}
                >
                  {CREATE_BUTTON_TITLE}
                </Button>
              </>,
            ]}
          />
        ) : null}
        <Form
          layout="vertical"
          form={createForm}
          id="packageCreate"
          onFieldsChange={handleFieldsChange}
          initialValues={initialValues}
          hidden={!showCreateForm}
        >
          <Form.Item
            label="Ubicación del paquete"
            name="location"
            rules={[
              {
                required: true,
                message: "Es obligatorio elegir la ubicación del paquete",
              },
            ]}
          >
            <Input
              readOnly
              placeholder="Elige el nombre del paquete"
              value={packageLocation}
            />
          </Form.Item>
          <Form.Item
            label="Nombre del paquete"
            name="name"
            rules={[
              {
                required: true,
                message: "Es obligatorio elegir el nombre del paquete",
              },
            ]}
          >
            <Input placeholder="Elige el nombre del paquete" />
          </Form.Item>
          <Form.Item
            label="Tipo de paquete"
            name="type"
            rules={[{ required: true, message: "Elige el tipo de paquete" }]}
          >
            <Radio.Group
              block
              options={options}
              optionType="button"
              buttonStyle="solid"
              onChange={(e) => setPackageDependency(e.target.value)}
            />
          </Form.Item>
          <Form.Item label="Dependencia del paquete" name="dependency">
            <Input
              readOnly
              placeholder="Elige la dependencia del paquete"
              value={packageDependency}
            />
          </Form.Item>
        </Form>
        <Form
          layout="vertical"
          form={importForm}
          id="packageImport"
          onFieldsChange={handleFieldsChangeOnImport}
          hidden={!showImportForm}
        >
          <Form.Item
            label="URL del paquete"
            name="url"
            rules={[
              {
                required: true,
                message: "¡Es obligatorio completar la URL del paquete!",
              },
            ]}
          >
            <Input placeholder="https://github/user/repository-name" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default PackageDialog;
