export const ROUTES = {
  querySlim: (wsId) =>
    `/Relativity.Rest/api/Relativity.ObjectManager/v1/workspace/${wsId}/object/queryslim`,
  choiceParents: (wsId) =>
    `/relativity.rest/api/relativity-object-model/v1/workspaces/${wsId}/choices/parents`,
};
export const GUIDS = {
  ENTITY: "d216472d-a1aa-4965-8b36-367d43d4e64c",
  ANSWER_OBJ: "ebf38f2e-2654-460b-bf57-6dcd5ae64b89",
  DAT_OBJ: "c0554960-49cf-431d-9853-df4be5cddb74",
  FULL_NAME: "57928ef5-f29d-4137-a215-3a9ab3e3f82",
  QUESTION_ID: "141ae10a-b8f9-4df1-a46e-715901531f1c",
  QUESTION_TEXT: "d2df17af-55e4-440c-a357-04971ce6b797",
  SINGLE_CHOICE: "f1909ec6-3a46-4e25-a198-b438da368eb2",
  YES_NO: "1801725a-7fd3-46b7-9acc-1131ba0bc22c",
  MULTI_CHOICE: "da29644f-3dee-4e76-8128-21c23790b964",
  LONG_TEXT: "19ab3c19-970d-46f3-b6bd-f905ad3edc1a",
  DAT: "921ca4eb-459c-47b1-ae1c-20aed2c69b84",
  RESPONDENT_REF: "69bade15-46c0-44e5-a1ec-ea404317869b",
  DAT_NAME: "70df54b0-b1f3-45fc-a64f-e03d2aae09b0",
  TYPE_SINGLE: "0c340d4f-9a6f-43a0-a021-8f1ae3b6818c",
  TYPE_YESNO: "50786d8a-52ef-4267-acaf-24e52fb80ce0",
  TYPE_MULTI: "c52db31e-80b8-4b04-bbe5-d1f8fa12b550",
  TYPE_LONGTEXT: "c7a77335-ed71-4d59-890d-bebf7865793e",
  VERTICALS_FIELD: "4a25ec45-6660-4b2d-aadc-9f067d4c651d",
};
