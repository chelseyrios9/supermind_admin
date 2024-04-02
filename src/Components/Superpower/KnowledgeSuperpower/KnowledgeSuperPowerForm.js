import React, { useCallback, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Form, Formik } from "formik";
import { Row, Col, Card } from "reactstrap";
import { KnowledgeSuperPowerTabTitleListData } from "@/Data/TabTitleListData";
import FormBtn from "@/Elements/Buttons/FormBtn";
import request from "@/Utils/AxiosUtils";
import { KnowledgeSuperpowerAPI } from "@/Utils/AxiosUtils/API";
import { YupObject } from "@/Utils/Validation/ValidationSchemas";
import Loader from "@/Components/CommonComponent/Loader";
import TabTitle from "@/Components/Coupon/TabTitle";
import { SuperpowerInitValues, SuperpowerValidationSchema } from "./KnowledgeSuperpowerObjects";
import SuperpowerSubmitFunction from "./KnowledgeSuperpowerSubmitFunction";
import SettingContext from "@/Helper/SettingContext";
import AllSuperPowerTabs from "./AllKnowledgeSuperPowerTabs";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";

const SuperPowerForm = ({ mutate, loading, updateId, title }) => {
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, 'common');
  const [activeTab, setActiveTab] = useState("1");
  const { state } = useContext(SettingContext)
  const { data: oldData, isLoading: oldDataLoading, refetch, status } = useQuery([updateId], () => request({ url: `${KnowledgeSuperpowerAPI}/${updateId}` }), { refetchOnWindowFocus: false, enabled: false, select: (data) => data.data });
  useEffect(() => {
    if (updateId) {
      refetch();
    }
  }, [updateId, loading]);
  const watchEvent = useCallback((oldData, updateId) => {
    return SuperpowerInitValues(oldData, updateId)
  }, [oldData, updateId])

  if ((updateId && oldDataLoading)) return <Loader />;
  return (
    <Formik
      initialValues={{ ...watchEvent(oldData, updateId) }}
      validationSchema={YupObject({
        ...SuperpowerValidationSchema,
      })}
      onSubmit={(values) => {
        if (updateId) {
          values["_method"] = "put"
        }
        SuperpowerSubmitFunction(mutate, values, updateId);
      }}>
      {({ values, setFieldValue, errors, touched }) => (
        <Form className="theme-form theme-form-2 mega-form vertical-tabs">
          <Row>
            <Col>
              <Card>
                <div className="title-header option-title">
                  <h5>{t(title)} - {values['name']}</h5>
                </div>
                <Row>
                  <Col xl="3" lg="4">
                    <TabTitle activeTab={activeTab} setActiveTab={setActiveTab} titleList={KnowledgeSuperPowerTabTitleListData} errors={errors} touched={touched} />
                  </Col>
                  <AllSuperPowerTabs values={values} activeTab={activeTab} setFieldValue={setFieldValue} errors={errors} updateId={updateId} />
                  <FormBtn loading={loading} />
                </Row>
              </Card>
            </Col>
          </Row>
        </Form>
      )}
    </Formik>
  );
};

export default SuperPowerForm;