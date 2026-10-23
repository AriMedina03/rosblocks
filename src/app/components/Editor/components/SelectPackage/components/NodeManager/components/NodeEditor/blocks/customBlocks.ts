import * as Blockly from "blockly/core";

const PROPERTY_PLACEHOLDER: Blockly.MenuOption[] = [
  ["Selecciona la interfaz primero", ""],
];
const PROPERTY_LOADING: Blockly.MenuOption[] = [["Cargando propiedades...", ""]];
const PROPERTY_EMPTY: Blockly.MenuOption[] = [["Sin propiedades", ""]];

// Propiedades ya consultadas por interfaz (resultado de `ros2 interface show`).
// Sirve para no repetir la consulta y para validar el valor guardado del
// dropdown PROPERTY al reabrir un nodo.
const propertiesCache = new Map<string, Blockly.MenuOption[]>();
const pendingRequests = new Map<string, Promise<Blockly.MenuOption[] | null>>();

function fetchPropertyOptions(
  location: string
): Promise<Blockly.MenuOption[] | null> {
  const cached = propertiesCache.get(location);
  if (cached) return Promise.resolve(cached);
  const pending = pendingRequests.get(location);
  if (pending) return pending;

  const request = window.electronAPI
    .getMessageProperties(location)
    .then((properties) => {
      const options: Blockly.MenuOption[] =
        properties && properties.length > 0
          ? properties.map(
              (prop) => [prop.name, prop.property] as Blockly.MenuOption
            )
          : PROPERTY_EMPTY;
      propertiesCache.set(location, options);
      return options;
    })
    .catch((error) => {
      console.error("Failed to fetch ROS2 message properties:", error);
      return null;
    })
    .finally(() => pendingRequests.delete(location));
  pendingRequests.set(location, request);
  return request;
}

/**
 * Dropdown de propiedades de un mensaje ROS2. Sus opciones dependen de la
 * interfaz elegida en otro campo del mismo bloque (`interfaceField`).
 *
 * Un `field_dropdown` normal rechaza cualquier valor que no esté en su lista
 * de opciones. Al abrir un nodo guardado, Blockly asigna el valor de PROPERTY
 * antes de que se hayan consultado las propiedades de la interfaz, así que el
 * valor guardado se descartaba. Este campo acepta el valor mientras llegan las
 * propiedades y lo confirma (o lo reemplaza) cuando ya están disponibles.
 */
class FieldMessageProperty extends Blockly.FieldDropdown {
  private interfaceField = "INTERFACE";
  /** Valor asignado antes de conocer las propiedades de la interfaz. */
  private pendingValue: string | null = null;
  private requestId = 0;

  constructor(interfaceField: string, config?: Blockly.FieldDropdownConfig) {
    super(
      function (this: Blockly.FieldDropdown) {
        return (this as FieldMessageProperty).buildOptions();
      },
      undefined,
      config
    );
    this.interfaceField = interfaceField;
  }

  static fromJson(
    options: Blockly.FieldDropdownFromJsonConfig & { interfaceField?: string }
  ): FieldMessageProperty {
    return new FieldMessageProperty(
      options.interfaceField ?? "INTERFACE",
      options
    );
  }

  private getLocation(): string {
    return this.getSourceBlock()?.getFieldValue(this.interfaceField) ?? "";
  }

  private buildOptions(): Blockly.MenuOption[] {
    const location = this.getLocation();
    if (!location) return PROPERTY_PLACEHOLDER;
    const cached = propertiesCache.get(location);
    if (cached) return cached;
    this.loadProperties(location);
    const pending = this.pendingValue;
    return pending ? [[pending, pending]] : PROPERTY_LOADING;
  }

  protected override doClassValidation_(newValue?: string): string | null {
    if (newValue === undefined || newValue === null) return null;
    // Las opciones dependen de la interfaz actual: no usar la caché del campo.
    if (this.getOptions(false).some((option) => option[1] === newValue)) {
      return newValue;
    }
    const location = this.getLocation();
    if (location && !propertiesCache.has(location)) {
      this.pendingValue = newValue;
      this.getOptions(false);
      return newValue;
    }
    return null;
  }

  /** Llamar cuando cambia la interfaz del bloque. */
  onInterfaceChanged(): void {
    this.pendingValue = null;
    const options = this.getOptions(false);
    this.setValue(options[0][1]);
    this.forceRerender();
  }

  private loadProperties(location: string): void {
    const requestId = ++this.requestId;
    fetchPropertyOptions(location).then((options) => {
      const block = this.getSourceBlock();
      if (requestId !== this.requestId || !block || block.isDisposed()) return;
      if (this.getLocation() !== location) return;
      // Si falló la consulta se conserva el valor pendiente para no perderlo.
      if (!options) return;

      const wanted = this.pendingValue ?? this.getValue() ?? "";
      this.pendingValue = null;
      const fresh = this.getOptions(false);
      const isValid = fresh.some((option) => option[1] === wanted);
      this.setValue(isValid ? wanted : fresh[0][1]);
      this.forceRerender();
    });
  }
}

const FIELD_MESSAGE_PROPERTY = "field_message_property";
if (!Blockly.registry.hasItem(Blockly.registry.Type.FIELD, FIELD_MESSAGE_PROPERTY)) {
  Blockly.fieldRegistry.register(FIELD_MESSAGE_PROPERTY, FieldMessageProperty);
}

/** Refresca el dropdown PROPERTY cuando el usuario cambia la interfaz. */
function onInterfaceFieldChange(interfaceField: string) {
  return function (this: Blockly.Block, event: Blockly.Events.Abstract) {
    if (!this.workspace || this.isInFlyout) return;
    if (
      event.type === Blockly.Events.BLOCK_CHANGE &&
      (event as Blockly.Events.BlockChange).blockId === this.id &&
      (event as Blockly.Events.BlockChange).name === interfaceField
    ) {
      const propertyField = this.getField("PROPERTY");
      if (propertyField instanceof FieldMessageProperty) {
        propertyField.onInterfaceChanged();
      }
    }
  };
}

export async function defineCustomBlocks() {
  let interfaceOptions: string[][] = [["-", ""]];

  try {
    const result = await window.electronAPI.getInterfaces();
    const fetchedOptions = result.map((ROSInterface) => [
      ROSInterface.name,
      ROSInterface.location,
    ]);

    interfaceOptions = interfaceOptions.concat(fetchedOptions).sort();
  } catch (error) {
    console.error("Failed to fetch ROS2 interfaces:", error);
  }

  const executableOptions: string[][] = [
    ["Turtlesim (GUI)", "ros2 run turtlesim turtlesim_node"],
    ["Turtlesim Teleop", "ros2 run turtlesim turtle_teleop_key"],
  ];

  const blocks = [
    {
      type: "add_class",
      message0: "Iniciar clase %1",
      args0: [
        {
          type: "field_input",
          name: "CLASS_NAME",
          text: "Define el nombre de la clase",
        },
      ],
      message1: "%1",
      args1: [
        {
          type: "input_statement",
          name: "CLASS_BODY",
        },
      ],
      colour: "#40a02b",
      previousStatement: null,
      nextStatement: null,
      tooltip: "Define una clase en Python.",
      helpUrl: "",
    },
    {
      type: "add_class_inheritance",
      message0: "Iniciar clase %1 heredando de la clase %2",
      args0: [
        {
          type: "field_input",
          name: "CLASS_NAME",
          text: "Define el nombre de la clase",
        },
        {
          type: "field_input",
          name: "EXTENDS_NAME",
          text: "Define el nombre de la clase a heredar",
        },
      ],
      message1: "%1",
      args1: [
        {
          type: "input_statement",
          name: "CLASS_BODY",
        },
      ],
      colour: "#40a02b",
      previousStatement: null,
      nextStatement: null,
      tooltip: "Define una clase en Python.",
      helpUrl: "",
    },
    {
      type: "add_import",
      message0: "Importar %1",
      args0: [
        {
          type: "field_input",
          name: "IMPORT_NAME",
          text: "Define el nombre del paquete",
        },
      ],
      colour: "#fe640b",
      previousStatement: null,
      nextStatement: null,
      tooltip: "Importa un paquete Python",
      helpUrl: "",
    },
    {
      type: "add_import_as",
      message0: "Importar %1 como %2",
      args0: [
        {
          type: "field_input",
          name: "IMPORT_NAME",
          text: "Define el nombre del paquete",
        },
        {
          type: "field_input",
          name: "ALIAS_NAME",
          text: "Define el nombre del alias",
        },
      ],
      colour: "#fe640b",
      previousStatement: null,
      nextStatement: null,
      tooltip: "Importa un paquete Python",
      helpUrl: "",
    },
    {
      type: "add_from_import",
      message0: "Desde %1 importar %2",
      args0: [
        {
          type: "field_input",
          name: "PACKAGE_NAME",
          text: "Define el nombre del paquete",
        },
        {
          type: "field_input",
          name: "METHOD_NAME",
          text: "Define el nombre del método",
        },
      ],
      colour: "#fe640b",
      previousStatement: null,
      nextStatement: null,
      tooltip: "Importa un paquete Python",
      helpUrl: "",
    },
    {
      type: "add_function",
      message0: "Función %1",
      args0: [
        {
          type: "field_input",
          name: "FUNCTION_NAME",
          text: "Define el nombre de la función",
        },
      ],
      message1: "%1",
      args1: [
        {
          type: "input_statement",
          name: "FUNCTION_BODY",
        },
      ],
      colour: "#8839ef",
      previousStatement: null,
      nextStatement: null,
      tooltip: "Agrega una función",
      helpUrl: "",
    },
    {
      type: "class_init",
      message0: "Inicializa el constructor de la clase %1",
      args0: [
        {
          type: "field_input",
          name: "CLASS_NAME",
          text: "Define el nombre de la clase",
        },
      ],
      message1: "%1",
      args1: [
        {
          type: "input_statement",
          name: "CONSTRUCTOR_BODY",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#40a02b",
      tooltip: "Agrega el constructor de la clase",
      helpUrl: "",
    },
    {
      type: "node_init",
      message0: "Configura el nodo %1",
      args0: [
        {
          type: "field_input",
          name: "NODE_NAME",
          text: "Define el nombre del nodo",
        },
      ],
      message1: "%1",
      args1: [
        {
          type: "input_statement",
          name: "CONSTRUCTOR_BODY",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#1e66f5",
      tooltip: "Agrega el nodo",
      helpUrl: "",
    },
    {
      type: "start_node",
      message0: "Inicializa el nodo de la clase %1 con la función %2",
      args0: [
        {
          type: "field_input",
          name: "CLASS_NAME",
          text: "Define el nombre de la clase",
        },
        {
          type: "field_input",
          name: "FUNCTION_NAME",
          text: "Define el nombre de la función",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#1e66f5",
      tooltip: "Agrega el nodo",
      helpUrl: "",
    },
    {
      type: "init_statement",
      message0: "Inicializa la función %1 en el script",
      args0: [
        {
          type: "field_input",
          name: "FUNCTION_NAME",
          text: "Define el nombre de la función",
        },
      ],
      previousStatement: null,
      colour: "#40a02b",
      tooltip: "Agrega el inicializador del script",
      helpUrl: "",
    },
    {
      type: "add_interface",
      message0: "Importa la interfaz %1",
      args0: [
        {
          type: "field_dropdown",
          name: "INTERFACE",
          options: interfaceOptions,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#1e66f5",
      tooltip: "Agrega una interfaz ROS2",
      helpUrl: "",
    },
    {
      type: "add_pub",
      message0:
        "Agregar publicador %1 en el tópico %2 con interfaz %3 y tasa de actualización %4 Hz",
      args0: [
        {
          type: "field_input",
          name: "PUB_NAME",
          text: "Define el nombre del publicador",
        },
        {
          type: "field_input",
          name: "TOPIC_NAME",
          text: "Define el nombre del tópico",
        },
        {
          type: "field_dropdown",
          name: "INTERFACE",
          options: interfaceOptions,
        },
        {
          type: "field_number",
          name: "REFRESH_RATE",
          value: 10,
          min: 1,
          precision: 1,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#1e66f5",
      tooltip:
        "Define un publisher ROS con nombre, interfaz y tasa de actualización.",
      helpUrl: "",
    },
    {
      type: "add_variable",
      message0: "Asigna a la variable %1 el valor %2",
      args0: [
        {
          type: "field_input",
          name: "VARIABLE",
          text: "Define el nombre de la variable",
        },
        {
          type: "input_value",
          name: "VALUE",
          text: "Define el valor de la variable",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      inputsInline: true,
      colour: "#e64553",
      tooltip: "Agrega una variable al script",
      helpUrl: "",
    },
    {
      type: "add_numeric_value",
      message0: "%1",
      args0: [
        {
          type: "field_number",
          name: "NUMERIC_VALUE",
          text: "Define el valor de la variable",
        },
      ],
      colour: "#df8e1d",
      output: null,
      precision: 0.01,
      tooltip: "Agrega una variable al script",
      helpUrl: "",
    },
    {
      type: "add_string_value",
      message0: `" %1 "`,
      args0: [
        {
          type: "field_input",
          name: "STRING_VALUE",
        },
      ],
      colour: "#df8e1d",
      output: null,
      tooltip: "Agrega una variable al script",
      helpUrl: "",
    },
    {
      type: "add_boolean_value",
      message0: `%1`,
      args0: [
        {
          type: "field_dropdown",
          options: [
            ["Verdadero", "True"],
            ["Falso", "False"],
          ],
          name: "BOOL_VALUE",
          checked: true,
        },
      ],
      colour: "#df8e1d",
      output: null,
      tooltip: "Agrega una variable al script",
      helpUrl: "",
    },
    {
      type: "add_casting",
      message0: `como %1 %2`,
      args0: [
        {
          type: "field_dropdown",
          options: [
            ["texto", "str"],
            ["entero", "int"],
            ["flotante", "float"],
            ["booleano", "bool"],
          ],
          name: "DATA_TYPE",
          checked: true,
        },
        {
          type: "input_value",
          name: "VALUE",
          text: "Define el valor",
        },
      ],
      colour: "#df8e1d",
      inputsInline: true,
      output: null,
      tooltip: "Agrega una variable al script",
      helpUrl: "",
    },
    {
      type: "add_literal_value",
      message0: `%1`,
      args0: [
        {
          type: "field_input",
          name: "LITERAL_VALUE",
          text: "Define el nombre de la variable",
        },
      ],
      colour: "#df8e1d",
      output: null,
      tooltip: "Describe una variable literal",
      helpUrl: "",
    },
    {
      type: "add_literal",
      message0: `%1`,
      args0: [
        {
          type: "field_input",
          name: "LITERAL",
          text: "Define el literal",
        },
      ],
      colour: "#df8e1d",
      output: null,
      tooltip: "Describe un literal",
      helpUrl: "",
    },
    {
      type: "add_counter",
      message0: `Agrega el contador a la función %1 con intervalo de %2`,
      args0: [
        {
          type: "field_input",
          name: "FUNCTION_NAME",
          text: "Define el nombre de la función",
        },
        {
          type: "field_number",
          name: "INTERVAL",
          value: 1,
          min: 1,
          precision: 1,
        },
      ],
      colour: "#1e66f5",
      output: null,
      tooltip: "Agrega un contador con intervalo que llama a una función",
      helpUrl: "",
    },
    {
      type: "add_python_version",
      message0: "Define la versión %1 de Python",
      args0: [
        {
          type: "field_dropdown",
          options: [
            ["3", "3"],
            ["3.6", "3.6"],
            ["3.7", "3.7"],
            ["3.8", "3.8"],
            ["3.9", "3.9"],
            ["3.10", "3.10"],
          ],
          name: "PYTHON_VERSION",
          checked: true,
        },
      ],
      colour: "#fe640b",
      nextStatement: null,
      tooltip: "Agrega una variable al script",
      helpUrl: "",
    },
    {
      type: "add_logger",
      message0: "Registra %1: %2",
      args0: [
        {
          type: "field_dropdown",
          options: [
            ["la información", "info"],
            ["el error", "error"],
            ["la advertencia", "warning"],
            ["el debug", "debug"],
          ],
          name: "LOG_LEVEL",
          checked: true,
        },
        {
          type: "input_value",
          name: "LOG_TEXT",
          text: "Define el texto que se mostrará",
        },
      ],
      colour: "#1e66f5",
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      tooltip: "Agrega un registro al nodo",
      helpUrl: "",
    },
    {
      type: "add_message",
      message0:
        "Asigna al mensaje con interfaz %1, propiedad %2 el valor %3",
      args0: [
        {
          type: "field_dropdown",
          name: "INTERFACE",
          options: interfaceOptions,
        },
        {
          type: FIELD_MESSAGE_PROPERTY,
          name: "PROPERTY",
          interfaceField: "INTERFACE",
        },
        {
          type: "input_value",
          name: "VALUE",
          text: "Define el nombre de la variable",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#1e66f5",
      tooltip: "Agrega un mensaje ROS2",
      helpUrl: "",
    },
    {
      type: "publish_message",
      message0: "Publica el mensaje en %1",
      args0: [
        {
          type: "field_input",
          name: "PUBLISHER_NAME",
          text: "Define el nombre del publicador",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#1e66f5",
      tooltip: "Publica el mensaje en el publicador",
      helpUrl: "",
    },
    {
      type: "subscribe_message",
      message0: `Asigna el valor del mensaje con la interfaz %1
         y la propiedad %2 en la variable %3`,
      args0: [
        {
          type: "field_dropdown",
          name: "MESSAGE_INTERFACE",
          options: interfaceOptions,
        },
        {
          type: FIELD_MESSAGE_PROPERTY,
          name: "PROPERTY",
          interfaceField: "MESSAGE_INTERFACE",
        },
        {
          type: "field_input",
          name: "VARIABLE_NAME",
          text: "Define el nombre de la variable",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#1e66f5",
      tooltip: "Almacena los datos del mensaje en el suscriptor",
      helpUrl: "",
    },
    {
      type: "add_callback_function",
      message0: `Agrega la función de retorno %1 con la interfaz %2`,
      args0: [
        {
          type: "field_input",
          name: "FUNCTION_NAME",
          text: "Define el nombre de la función",
        },
        {
          type: "field_dropdown",
          name: "INTERFACE",
          options: interfaceOptions,
        },
      ],
      message1: "%1",
      args1: [
        {
          type: "input_statement",
          name: "FUNCTION_BODY",
        },
      ],
      colour: "#1e66f5",
      previousStatement: null,
      nextStatement: null,
      tooltip: "Agrega una función de retorno de llamada",
      helpUrl: "",
    },
    {
      type: "create_timer",
      message0:
        "Crear un temporizador %1 con intervalo %2 y publicar en la función %3",
      args0: [
        {
          type: "field_input",
          name: "TEMP_NAME",
          text: "Define el nombre del temporizador",
        },
        {
          type: "field_number",
          name: "DURATION",
          value: 1.0,
          min: 1.0,
          precision: 1.0,
        },
        {
          type: "input_value",
          name: "PUBLISHER_COUNTER",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#1e66f5",
      tooltip: "Agrega una función contadora y publicadora",
      helpUrl: "",
    },
    {
      type: "counter_function",
      message0:
        "Agrega la función contadora con la interfaz %1, inicia el contador con el valor %2 y publica en %3",
      args0: [
        {
          type: "field_dropdown",
          name: "COUNTER_INTERFACE",
          options: interfaceOptions,
        },
        {
          type: "field_number",
          name: "COUNTER",
          value: 0,
          min: 0,
          precision: 1,
        },
        {
          type: "field_input",
          name: "PUBLISHER",
          text: "Define el nombre del publicador",
        },
      ],
      output: null,
      colour: "#1e66f5",
      tooltip: "Agrega una función que publica el contador",
      helpUrl: "",
    },
    {
      type: "add_information",
      message0: "Agrega el texto de log %1",
      args0: [
        {
          type: "field_input",
          name: "LOG_INFO",
          text: "Define el texto que se mostrará",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#1e66f5",
      tooltip: "Agrega un texto de log",
      helpUrl: "",
    },
    {
      type: "add_velocity",
      message0: "Agrega un mensaje de velocidad %1 con el valor %2",
      args0: [
        {
          type: "field_dropdown",
          name: "PROPERTY",
          options: [
            ["linear.x", "linear.x"],
            ["linear.y", "linear.y"],
            ["linear.z", "linear.z"],
            ["angular.x", "angular.x"],
            ["angular.y", "angular.y"],
            ["angular.z", "angular.z"],
          ],
        },
        {
          type: "field_number",
          name: "VELOCITY_VALUE",
          value: 0,
          min: 0,
          precision: 1,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#1e66f5",
      tooltip: "Agrega un valor de velocidad",
      helpUrl: "",
    },
    {
      type: "add_sub",
      message0: `Agregar suscriptor %1 
      en el tópico %2 
      con interfaz %3, 
      tasa de actualización %4 Hz 
      y almacena los datos en %5`,
      args0: [
        {
          type: "field_input",
          name: "SUB_NAME",
          text: "Define el nombre del suscriptor",
        },
        {
          type: "field_input",
          name: "TOPIC_NAME",
          text: "Define el nombre del tópico",
        },
        {
          type: "field_dropdown",
          name: "INTERFACE",
          options: interfaceOptions,
        },
        {
          type: "field_number",
          name: "REFRESH_RATE",
          value: 10,
          min: 1,
          precision: 1,
        },
        {
          type: "field_input",
          name: "FUNCTION_NAME",
          text: "Define el nombre de la función",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#1e66f5",
      tooltip:
        "Define un subscriber ROS2 con nombre, interfaz y tasa de actualización.",
      helpUrl: "",
    },
    {
      type: "init_node_template",
      message0: `Agrega el/los paquete(s): %1`,
      args0: [
        {
          type: "input_statement",
          name: "IMPORT_PACKAGES",
        },
      ],
      message1: `Define la clase %1`,
      args1: [
        {
          type: "field_input",
          name: "CLASS_NAME",
          text: "Escribe el nombre de la clase",
        },
      ],
      message2: "%1",
      args2: [
        {
          type: "input_statement",
          name: "TEMPLATE_BODY",
        },
      ],
      message3: "inicializa el nodo de la clase %1",
      args3: [
        {
          type: "field_input",
          name: "NODE_CLASS_NAME",
          text: "Escribe el nombre de la clase",
        },
      ],
      colour: "#5c5f77",
      tooltip:
        "Define una plantilla de nodo ROS2 con importaciones, clase e inicialización del nodo.",
      helpUrl: "",
    },
    {
      type: "execute_literal",
      message0: "Ejecutar %1",
      args0: [
        {
          type: "input_value",
          name: "CODE",
        },
      ],
      colour: "#df8e1d",
      previousStatement: null,
      nextStatement: null,
      tooltip: "Ejecuta el código indicado (p. ej. llamadas a funciones).",
      helpUrl: "",
    },
    {
      type: "launch_executable",
      message0: "Ejecutar %1",
      args0: [
        {
          type: "field_dropdown",
          name: "EXECUTABLE_OPTION",
          options: executableOptions,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: "#1e66f5",
      tooltip:
        "Ejecuta un comando externo (como turtlesim) durante la ejecución del script.",
      helpUrl: "",
    },
    {
      type: "add_delay",
      message0: "Esperar %1 segundos",
      args0: [
        {
          type: "input_value",
          name: "SECONDS",
        },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: "#1e66f5",
      tooltip: "Pausa la ejecución durante los segundos indicados.",
      helpUrl: "",
    },
  ];

  // Register the blocks using createBlockDefinitionsFromJsonArray
  Blockly.defineBlocksWithJsonArray(blocks);

  Blockly.Blocks["subscribe_message"].onchange =
    onInterfaceFieldChange("MESSAGE_INTERFACE");
  Blockly.Blocks["add_message"].onchange = onInterfaceFieldChange("INTERFACE");
}
