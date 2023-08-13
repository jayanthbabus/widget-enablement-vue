<template>
  <v-container fluid class="pt-0">
    <v-toolbar dense>
      <div class="showing-message">
        Showing <strong>1</strong> -
        <strong>{{
          currentFromPageSize > tableObjectsList.length
            ? tableObjectsList.length
            : currentFromPageSize
        }}</strong>
        of
        <strong>{{ tableObjectsList.length }}</strong>
      </div>

      <v-spacer></v-spacer>
      <div>
        <!-- <button class="btn btn-primary"> test</button> -->
        <v-btn
          color="primary"
          small
          @click="resetFilters"
          prepend-icon="mdi-filter-remove-outline"
        >
          <template v-slot:prepend>
            <v-icon color="success"></v-icon>
          </template>
          Reset Filters
        </v-btn>
        <v-btn
          color="primary"
          small
          @click="exportToExcel"
          prepend-icon="mdi-file-excel"
        >
          <template v-slot:prepend>
            <v-icon color="green"></v-icon>
          </template>
          Export Excel
        </v-btn>
      </div>
    </v-toolbar>
    <div class="ag-grid-container" @contextmenu.prevent id="myGrid">
      <ag-grid-vue
        ref="agGrid"
        style="height: 89vh"
        class="ag-theme-alpine"
        :rowData="tableData"
        :is-quick-filter="true"
        :columnDefs="columnDefs"
        :gridOptions="gridOptions"
        @firstDataRendered="onFirstDataRendered"
        :defaultColDef="defaultColDef"
        animateRows="true"
        @gridReady="onGridReady"
        :rowSelection="rowSelection"
      ></ag-grid-vue>
      <loading-overlay v-if="isDataLoading" />
      <div
        v-if="showContextMenu"
        class="context-menu"
        :style="contextMenuStyle"
      >
        <div
          v-if="selectedRow['Modify'] === 'TRUE'"
          class="list-item"
          @click="handleContextMenuOption('edit')"
        >
          <v-icon class="pencil-icon">mdi-pencil</v-icon> Edit
        </div>
        <div
          v-if="selectedRow['Promote'] === 'TRUE'"
          class="list-item"
          @click="handleContextMenuOption('promote')"
        >
          <v-icon class="pencil-icon">mdi-upload</v-icon> Promote
        </div>
        <div
          v-if="selectedRow['Demote'] === 'TRUE'"
          class="list-item"
          @click="handleContextMenuOption('demote')"
        >
          <v-icon class="delete-icon">mdi-download</v-icon> Demote
        </div>
        <div
          v-if="selectedRow['Delete'] === 'TRUE'"
          class="list-item"
          @click="handleContextMenuOption('delete')"
        >
          <v-icon class="delete-icon">mdi-delete</v-icon> Delete
        </div>
        <!-- Add more context menu options as needed -->
      </div>

      <!-- <v-btn class="up-arrow" fab dark @click="scrollToTop">
        <v-icon>mdi-chevron-up</v-icon>
      </v-btn>

      <v-btn
        v-if="currentFromPageSize < tableObjectsList.length"
        class="down-arrow"
        fab
        dark
        @click="loadMoreRecords"
        :disabled="isLoadMoreDisabled"
      >
        <v-icon>mdi-chevron-down</v-icon>
      </v-btn> -->
    </div>
    <v-dialog v-model="editModalVisible" max-width="1000px">
      <v-card class="edit-modal">
        <v-toolbar dense flat>
          <v-toolbar-title class="edit-modal-title">Edit Row</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon @click="closeEditModal" class="edit-modal-close-btn">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-divider></v-divider>
        <v-card-text class="edit-modal-body">
          <v-form ref="editForm" @submit.prevent="saveRowChanges">
            <v-container>
              <v-row dense>
                <v-col
                  cols="6"
                  class="pe-5"
                  v-for="(value, key) in editableColumns"
                  :key="key"
                >
                  <template
                    v-if="value.customFieldSetting['Input Type'] === 'text'"
                  >
                    <v-text-field
                      dense
                      outlined
                      v-model="editedRow[value.name]"
                      :label="value.name"
                      required
                    ></v-text-field>
                  </template>
                  <template
                    v-else-if="
                      value.customFieldSetting['Input Type'] === 'radio'
                    "
                  >
                    <v-label class="radio-label">{{ value.name }}</v-label>
                    <v-radio-group v-model="editedRow[value.name]" row>
                      <v-radio
                        v-for="(option, index) in [
                          'Option 1',
                          'Option 2',
                          'Option 3',
                        ]"
                        :key="index"
                        :label="option"
                        :value="option"
                      ></v-radio>
                    </v-radio-group>
                  </template>
                  <!-- <template v-else-if="value.customFieldSetting['Input Type'] === 'dropdown'">
                                      <v-select
                                          dense
                                          outlined
                                          v-model="editedRow[value.name]"
                                          :label="value.name"
                                          :items="['Approved', 'Obsolete', 'Create', 'Released', 'Review']"
                                      ></v-select>
                                  </template> -->

                  <template
                    v-else-if="
                      value.customFieldSetting['Input Type'] === 'checkbox'
                    "
                  >
                    <v-checkbox
                      dense
                      v-model="editedRow[value.name]"
                      :label="value.name"
                    ></v-checkbox>
                  </template>
                  <template
                    v-else-if="
                      value.customFieldSetting['Input Type'] === 'date'
                    "
                  >
                    <!-- <v-date-picker dense v-model="editedRow[value.name]" :label="value.name"></v-date-picker> -->
                    <v-menu offset-y>
                      <template v-slot:activator="{ on }">
                        <v-text-field
                          dense
                          outlined
                          v-model="editedRow[value.name]"
                          :label="value.name"
                          readonly
                          v-on="on"
                        ></v-text-field>
                      </template>
                      <v-date-picker
                        v-model="editedRow[value.name]"
                      ></v-date-picker>
                    </v-menu>
                  </template>
                  <template
                    v-else-if="
                      value.customFieldSetting['Input Type'] === 'dropdown'
                    "
                  >
                    <v-select
                      dense
                      outlined
                      v-model="editedRow[value.name]"
                      :label="value.name"
                      :items="[
                        'Approved',
                        'Obsolete',
                        'Create',
                        'Released',
                        'Review',
                      ]"
                      multiple
                      chips
                      clearable
                      :search-input.sync="searchInput"
                      class="custom-multi-select"
                    ></v-select>
                  </template>

                  <!-- <v-text-field dense outlined v-model="editedRow[value.name]" :label="value.name" required></v-text-field> -->
                </v-col>
              </v-row>
            </v-container>
          </v-form>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="edit-modal-actions">
          <v-btn color="primary" @click="saveRowChanges">Save</v-btn>
          <v-btn color="error" @click="closeEditModal">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import { ref, reactive, watchEffect, onMounted } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { write as writeExcel, utils as XLSXUtils } from "xlsx";
import { saveAs } from "file-saver";
import axios from "axios";
import moment from "moment";
import LoadingOverlay from "@/components/LoadingOverlay.vue";
import {
  filterColumnsBasedOnAccessExpression,
  getColumnsBasedOnFieldSettingNameAndValue,
  makeSingleApiCall,
} from "../utils/utils.js";

export default {
  name: "DashboardTable",
  components: {
    "ag-grid-vue": AgGridVue,
    LoadingOverlay,
  },
  setup() {
    const agGridApi = ref(null);
    const defaultColDef = {
      filter: true,
      sortable: true,
      resizable: true,
      minWidth: 150,
      flex: 2,
      maxWidth: 300,
    };
    const gridOptions = {
      rowHeight: 24,
      suppressAutoSize: true,
    };
    const columnDefs = ref([]);
    const apiData = ref([]);
    const columnList = ref([]);
    const tableData = ref([]);
    const tableColumnsData = ref([]);
    const tableObjectsList = ref([]);
    const editableColumns = ref([]);
    const showContextMenu = ref(false);
    const contextMenuStyle = reactive({
      top: 0,
      left: 0,
    });
    const editModalVisible = ref(false);
    const selectedRow = ref(null);
    const editedRow = ref({});
    const rowSelection = "multiple";
    const defaultPageSize = 30;
    const currentFromPageSize = ref(0);
    const currentToPageSize = ref(30);
    const searchInput = "";
    const isLoadMoreDisabled = ref(false);
    const loadMorePageSize = 30;
    const isDataLoading = ref(true);

    const fetchApiData = async () => {
      try {
        const tableColumnsResponse = await axios.get(
          "http://localhost:8080/widgets/WidgetService/getTable/MEPSummary"
        );

        tableColumnsData.value = tableColumnsResponse.data;
        columnList.value =
          tableColumnsData.value.ematrix.table.columnList.column.map(
            (column) => {
              const fieldSettings = column.fieldSettingList.fieldSetting;
              column.customFieldSetting = {};
              fieldSettings.forEach((setting) => {
                const { fieldSettingName, fieldSettingValue } = setting;
                column.customFieldSetting[fieldSettingName] =
                  fieldSettingValue.toString();
              });
              return column;
            }
          );

        getDataForBasedOnColumnWise(
          currentFromPageSize.value,
          currentToPageSize.value
        );
      } catch (error) {
        console.error(error);
        tableData.value = [];
        isDataLoading.value = false;
      }
    };

    const handleGridScroll = (event) => {
      const scrollElement = event.target;
      const isAtBottom =
        scrollElement.scrollTop + scrollElement.clientHeight ===
        scrollElement.scrollHeight;
      if (isAtBottom) {
        loadMoreRecords();
        agGridApi.value.sizeColumnsToFit();
      }
    };

    const getDataForBasedOnColumnWise = async (from, to) => {
      isDataLoading.value = true;
      const evaluateAccessUrl =
        "http://localhost:8080/widgets/WidgetService/evaluateAccess";
      const getObjectsUrl =
        "http://localhost:8080/widgets/WidgetService/getObjectData";
      const getRowValuesUrl =
        "http://localhost:8080/widgets/WidgetService/getRowValues";

      const columnsForEvaluation = [];
      const columnsReadyForShow = [];
      columnList.value.map((value) => {
        const keys = Object.keys(value.customFieldSetting);
        if (
          keys.includes("Access Expression") ||
          keys.includes("Access Function") ||
          keys.includes("Access Program")
        ) {
          columnsForEvaluation.push({
            ColumnName: value.name,
            Settings: value.customFieldSetting,
          });
        } else {
          columnsReadyForShow.push({
            ColumnName: value.name,
            Expression: value.expression,
            Settings: value.customFieldSetting,
          });
        }
      });

      const evaluatedColumns = await makeSingleApiCall(
        { ColumnList: columnsForEvaluation },
        evaluateAccessUrl
      );
      const trueColumns = evaluatedColumns.reduce((result, obj) => {
        Object.entries(obj).forEach(([key, value]) => {
          if (value === "true" && !result.includes(key)) {
            result.push(key);
          }
        });
        return result;
      }, []);

      columnList.value.forEach((item) => {
        if (trueColumns.includes(item.name)) {
          columnsReadyForShow.push({
            ColumnName: item.name,
            Expression: item.expression,
            Settings: item.customFieldSetting,
          });
        }
      });

      columnDefs.value = columnsReadyForShow.map((value) => {
        if (value.Settings["Input Type"] === "date") {
          return {
            headerName: value.ColumnName,
            field: value.ColumnName,
            filter: "agDateColumnFilter",
            filterParams: {
              browserDatePicker: true,
              comparator: customDateComparator,
            },
          };
        }
        return {
          headerName: value.ColumnName,
          field: value.ColumnName,
          filter: "agTextColumnFilter",
          cellRenderer: (params) => {
            const content = params.value;
            const tooltip = `<span title="${content}">${content}</span>`;
            return tooltip;
          },
        };
      });
      columnDefs.value[0].pinned = "left";
      const response2 = await axios.post(getObjectsUrl, {
        Function: "getMEPData",
        Program: "emxManfacturingEquivalent",
        RegisteredSuite: "Framework",
      });
      tableObjectsList.value = response2.data;
      const mainPostBody = {
        ColumnList: columnsReadyForShow,
        ObjectList: tableObjectsList.value.slice(from, to),
      };

      try {
        const res = await makeSingleApiCall(mainPostBody, getRowValuesUrl);
        isDataLoading.value = false;
        tableData.value = [...tableData.value, ...res];
        if (currentToPageSize.value > tableObjectsList.value.length) {
          currentToPageSize.value = tableObjectsList.value.length;
        } else {
          currentToPageSize.value =
            currentFromPageSize.value + Number(loadMorePageSize);
        }
        currentFromPageSize.value = currentToPageSize.value;
        if (agGridApi.value) {
          setTimeout(() => {
            const rowNode = agGridApi.value.getRowNode(
              currentFromPageSize.value - loadMorePageSize
            );
            console.log(rowNode);
            if (rowNode) {
              agGridApi.value.ensureNodeVisible(rowNode, "middle");
            }
          }, 0);

          // agGridApi.value.ensureIndexVisible(
          //   currentFromPageSize.value - loadMorePageSize,
          //   "middle"
          // );
        }
      } catch (err) {
        console.log(err);
        tableData.value = [];
        isDataLoading.value = false;
      }
    };

    const loadMoreRecords = async () => {
      const recordsToLoad = loadMorePageSize;
      isLoadMoreDisabled.value = true;
      await getDataForBasedOnColumnWise(
        currentFromPageSize.value,
        currentFromPageSize.value + Number(recordsToLoad)
      );
      isLoadMoreDisabled.value = false;
    };

    const scrollToTop = () => {
      agGridApi.value.ensureIndexVisible(0, "middle");
    };

    const customDateComparator = (filterLocalDateAtMidnight, cellValue) => {
      const cellDate = new Date(cellValue);
      if (isNaN(cellDate.getTime())) {
        return -1;
      }

      const filterDate = new Date(filterLocalDateAtMidnight);
      if (cellDate.getTime() === filterDate.getTime()) {
        return 0;
      } else if (cellDate.getTime() < filterDate.getTime()) {
        return -1;
      } else {
        return 1;
      }
    };

    const resetFilters = () => {
      if (agGridApi.value) {
        agGridApi.value.setFilterModel(null);
        agGridApi.value.onFilterChanged();
      }
    };

    const onFirstDataRendered = (params) => {
      isDataLoading.value = false;
      agGridApi.value = params.api;
      params.api.sizeColumnsToFit();
    };

    const onModelUpdated = () => {
      isDataLoading.value = tableData.value.length === 0;
    };

    const showContextMenuHandler = (event) => {
      selectedRow.value = event.data;
      if (event.event.button === 2) {
        event.event.preventDefault();
        showContextMenu.value = true;
        contextMenuStyle.top = `${event.event.clientY}px`;
        contextMenuStyle.left = `${event.event.clientX}px`;
        document.addEventListener("click", closeContextMenu);
      }
    };

    const closeContextMenu = (event) => {
      if (!event.target.closest(".context-menu")) {
        showContextMenu.value = false;
        contextMenuStyle.top = 0;
        contextMenuStyle.left = 0;
        document.removeEventListener("click", closeContextMenu);
      }
    };

    const handleContextMenuOption = (option) => {
      if (option === "edit") {
        editableColumns.value = getColumnsBasedOnFieldSettingNameAndValue(
          columnList.value,
          "editable",
          true
        );
        const dateInputTypes = editableColumns.value.filter(
          (column) => column.customFieldSetting["Input Type"] === "date"
        );
        dateInputTypes.forEach((value) => {
          selectedRow.value[value.name] = moment(
            selectedRow.value[value.name],
            "DD-MM-YYYY"
          ).format("YYYY-MM-DD");
        });
        editedRow.value = { ...selectedRow.value };
        editModalVisible.value = true;
      }
      showContextMenu.value = false;
    };

    const saveRowChanges = () => {
      if (editForm.value.validate()) {
        console.log("Edited row data:", editedRow.value);
        closeEditModal();
      }
    };

    const closeEditModal = () => {
      editedRow.value = {};
      editModalVisible.value = false;
    };
    const exportToExcel = () => {
      if (agGridApi.value) {
        // Get the ag-Grid data as an array of objects
        const rowData = [];
        agGridApi.value.forEachNode((node) => {
          rowData.push(node.data);
        });

        // Convert the data to a worksheet
        const worksheet = XLSXUtils.json_to_sheet(rowData);

        // Create a workbook and add the worksheet
        const workbook = XLSXUtils.book_new();
        XLSXUtils.book_append_sheet(workbook, worksheet, "Sheet 1");

        // Generate the Excel file
        const excelBuffer = writeExcel(workbook, {
          type: "array",
          bookType: "xlsx",
        });

        // Save the file
        const blob = new Blob([excelBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        saveAs(blob, "MEPSummary.xlsx");
      }
    };
    const preventContextMenu = () => {
      const gridElement = document.querySelector(".ag-root-wrapper");
      gridElement.addEventListener("contextmenu", (event) => {
        event.preventDefault();
      });
    };

    const onGridReady = (params) => {
      // params.api.sizeColumnsToFit(); // Resize columns to take full width // Register the context menu event listener
      params.api.addEventListener("cellMouseDown", showContextMenuHandler);
      preventContextMenu();

      agGridApi.value = params.api;

      const gridContainer = document.querySelector(".ag-root-wrapper-body");
      const scrollElement = gridContainer.querySelector(".ag-body-viewport");
      scrollElement.addEventListener("scroll", handleGridScroll);
    };
    onMounted(() => {
      console.log("component loading");
      fetchApiData();
    });
    watchEffect(() => {
      if (agGridApi.value) {
        agGridApi.value.addEventListener(
          "cellMouseDown",
          showContextMenuHandler
        );
        preventContextMenu();
        const gridContainer = document.querySelector(".ag-root-wrapper-body");
        const scrollElement = gridContainer.querySelector(".ag-body-viewport");
        scrollElement.addEventListener("scroll", handleGridScroll);
      }
    });

    return {
      agGridApi,
      defaultColDef,
      gridOptions,
      columnDefs,
      apiData,
      columnList,
      tableData,
      tableColumnsData,
      tableObjectsList,
      editableColumns,
      showContextMenu,
      contextMenuStyle,
      editModalVisible,
      selectedRow,
      editedRow,
      rowSelection,
      defaultPageSize,
      currentFromPageSize,
      currentToPageSize,
      searchInput,
      isLoadMoreDisabled,
      loadMorePageSize,
      isDataLoading,
      onGridReady,
      onFirstDataRendered,
      onModelUpdated,
      exportToExcel,
      showContextMenuHandler,
      preventContextMenu,
      closeContextMenu,
      handleContextMenuOption,
      saveRowChanges,
      closeEditModal,
      fetchApiData,
      handleGridScroll,
      getDataForBasedOnColumnWise,
      loadMoreRecords,
      scrollToTop,
      customDateComparator,
      resetFilters,
    };
  },
};
</script>
<style>
.ag-theme-alpine .ag-root-wrapper {
  border: 1px solid #ccc;
}

.ag-theme-alpine .ag-header-container {
  border-bottom: 1px solid #ccc;
}

.ag-theme-alpine .ag-cell {
  border-right: 1px solid #ccc;
}

.ag-theme-alpine .ag-row {
  border-bottom: 1px solid #ccc;
}

.table-heading {
  color: darkblue;
  font-size: 20px;
  text-align: center;
}

.sub-heading {
  font-size: 14px;
  text-align: center;
  color: #4d4343;
  margin-bottom: 10px;
}
.context-menu {
  position: absolute;
  width: 170px;
  background-color: white;
  border-radius: 1px;
  border: 1px solid #e5e5e5;
  font-size: 14px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.list-item {
  font-size: 14px;
  padding: 7px 10px;
  border-bottom: 1px solid #e5e5e5;
  cursor: pointer;
}
.list-item .pencil-icon {
  font-size: 17px !important;
  color: darkblue !important;
  padding-right: 12px;
}
.list-item .delete-icon {
  font-size: 17px !important;
  color: red !important;
  padding-right: 12px;
}
.list-item:hover {
  background-color: #f5f5f5;
}
.edit-modal {
  border-radius: 4px;
}

.edit-modal-title {
  font-size: 16px !important;
  font-weight: bold;
  color: darkblue;
}

.edit-modal-close-btn {
  color: #757575;
}

.edit-modal-body {
  max-height: 450px;
  overflow-y: auto;
  padding: 20px !important;
}

.edit-modal-actions {
  justify-content: flex-end;
}
.v-text-field input {
  font-size: 13px;
}
.v-label {
  font-size: 14px !important;
  color: black !important;
}
.v-input--selection-controls {
  margin-top: 0 !important;
}
/* .down-arrow {
    position: absolute !important;
    bottom: 10px;
    right: 10px;
}

.down-arrow i {
    color: #ffffff;
} */
.up-arrow,
.down-arrow {
  position: fixed !important;
  bottom: 38px;
  right: 3%;
  width: 35px !important;
  height: 35px !important;
  border: 1px solid #e5e5e5;
  background-color: #fff !important;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: blue !important;
  border-radius: 0px !important;
}

.right-arrow {
  width: 35px !important;
  height: 33px !important;
  border: 1px solid #e5e5e5;
  background-color: #fff !important;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: blue !important;
  border-radius: 5px !important;
  box-shadow: none !important;
}

.load-more-input-container {
  display: flex;
  margin-top: 24px;
}
.load-more-input {
  margin-right: 1px !important;
  width: 131px !important;
}
.load-more-input .v-input__slot {
  min-height: 20px !important; /* Adjust the height as needed */
}

.load-more-input .v-input__input {
  font-size: 12px; /* Adjust the font size as needed */
}
.up-arrow {
  bottom: 73px;
}
.showing-message {
  font-size: 14px;
  color: #555555;
  margin-right: 16px;
}

.custom-multi-select .v-chip.v-size--default {
  border-radius: 16px;
  font-size: 14px;
  height: 23px;
}

.v-toolbar__content {
  height: 50px !important;
  padding: 10px !important;
  background: white;
  border: 1px solid #e5e5e5;
}
</style>
