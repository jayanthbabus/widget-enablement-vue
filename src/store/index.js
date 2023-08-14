import { createStore } from "vuex"; // Import createStore from Vuex 4

export default createStore({
  state: {
    objectList: [],
    loading: false,
    loadingTitle: "",
    searchText: "",
    subscribed: false,
    numRecentItems: 0,
    details: {},
    taggerProxy: null,
  },
  getters: {
    object: (state) => {
      if (state.objectList.length > 0) {
        return state.objectList[0];
      }
    },
    // ... other getters
  },
  mutations: {
    // show the loading overlay
    loading(state, text) {
      state.loading = true;
      if (text) state.loadingTitle = text;
    },
    // hide the loading overlay
    loadingComplete(state) {
      state.loading = false;
      state.loadingTitle = "";
    },
    // add an item to the store list that was captured via the selection event
    addItem(state, object) {
      // add object to front of list
      state.objectList.unshift(object);

      // enforce num recent items preferences by trimming list as necessary
      if (state.objectList.length > state.numRecentItems) {
        state.objectList.splice(state.numRecentItems);
      }

      // transform objectlist into 6w tags and update tagger
      if (state.taggerProxy) {
        const tags = {};
        state.objectList.forEach((object) => {
          tags[object.id] = [];
          tags[object.id].push({
            object: object.type,
            sixw: "ds6w:what/type",
            dispValue: object.type,
          });
          tags[object.id].push({
            object: object.label,
            sixw: "ds6w:what/label",
            dispValue: object.label,
          });
          tags[object.id].push({
            object: object.id,
            sixw: "ds6w:what/id",
            dispValue: object.id,
          });
        });
        state.taggerProxy.setSubjectsTags(tags);
      }
    },
    // update the text typed into the filter bar
    searchText(state, text) {
      state.searchText = text;
    },
    // clear the objects and details from the view
    clearSelections(state) {
      state.objectList = [];
      state.details = {};
    },
    // internal mechanism to track that widget instance has subscribed to
    // event
    subscribed(state) {
      state.subscribed = true;
    },
    // create 6w tagger proxy
    createTaggerProxy(state, TagNavigatorProxy) {
      if (!state.taggerProxy) {
        const options = {
          widgetId: widget.id,
          filteringMode: "WithFilteringServices",
        };
        state.taggerProxy = TagNavigatorProxy.createProxy(options);
      }
    },
    // update the recent items based on the preference set in the widget
    setNumRecentItems(state, num) {
      state.numRecentItems = num;
      if (state.objectList && state.objectList.length > state.numRecentItems) {
        state.objectList.splice(state.numRecentItems);
      }
    },
    // set the object details
    setObjectDetails(state, details) {
      state.details = details;
    },
  },
  // actions are asyncronous modifications to the state based on user interactions
  actions: {
    // subscribe to the DS widget click event
    subscribeToClickEvent({ commit, state }) {
      // check if widget instance is already subscribed.
      if (!state.subscribed) {
        commit("subscribed");
        requirejs(["DS/PlatformAPI/PlatformAPI"], (PlatformAPI) => {
          PlatformAPI.subscribe(
            "DS/PADUtils/PADCommandProxy/select",
            (content) => {
              // Nothing selected
              if (content.data.paths.length === 0) {
                return;
              }

              // Get the physical ID from the path
              // There may be multiple elements in the PATH representing
              // the full structure PATH if from a indented table.  The selected
              // node is always the last one in the array
              const path = content.data.paths[content.data.paths.length - 1];
              const objectId = path[path.length - 1];
              let objectType = "";
              let objectLabel = "";

              // If the attributes object has an element for the selected
              // item then get its type and label
              if (content.data.attributes[objectId]) {
                objectType = content.data.attributes[objectId].type;
                objectLabel = content.data.attributes[objectId].label;
              }

              // add item to the table list
              if (objectId.length > 0) {
                commit("addItem", {
                  id: objectId,
                  type: objectType,
                  label: objectLabel,
                });
              }
            }
          );
        });
      }
    },
    // initialize the DS 6W tagger proxy
    init6WTagger({ commit, state }) {
      requirejs(
        ["DS/TagNavigatorProxy/TagNavigatorProxy"],
        (TagNavigatorProxy) => {
          // 6W Tagger proxy creation
          commit("createTaggerProxy", TagNavigatorProxy);

          // provide the callback function when 6w tag is selected
          state.taggerProxy.addEvent("onFilterSubjectsChange", (filters) => {
            if (
              filters.filteredSubjectList &&
              filters.filteredSubjectList.length > 0
            ) {
              this._vm.$awn.info(
                `Filtered Objects: ${filters.filteredSubjectList.join(", ")}`
              );
            }
          });
        }
      );
    },
    // call a DS ootb web service to get basic details of selected objects
    getObjectDetails({ commit, getters }) {
      const object = getters.object;
      if (object) {
        let url = "";

        // set URL based on object type
        if (object.type && object.type === "Document") {
          url = `/resources/v1/modeler/documents/${object.id}`;
        } else if (object.type && object.type === "VPMReference") {
          url = `/resources/v1/modeler/dseng/dseng:EngItem/${object.id}?$mask=dsmveng:EngItemMask.Details`;
        }
        if (url && url.length > 0) {
          commit("loading");
          Platform3DSpace.call3DSpace({
            method: "GET",
            url: url,
            type: "json",
          })
            .then((response) => {
              if (response) {
                if (response.data && response.data.length > 0) {
                  commit("setObjectDetails", response.data[0].dataelements);
                } else if (response.member && response.member.length > 0) {
                  commit("setObjectDetails", response.member[0]);
                }
              }
            })
            .catch((error) => {
              console.error(error);
              this._vm.$awn.alert(error);
            })
            .finally(() => {
              commit("loadingComplete", false);
            });
        }
      }
    },
  },
});
