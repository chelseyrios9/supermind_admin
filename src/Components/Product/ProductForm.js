import React, { useCallback, useContext, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Form, Formik } from "formik";
import { Row, Col, Card } from "reactstrap";
import { ProductTabTitleListData } from "../../Data/TabTitleListData";
import FormBtn from "../../Elements/Buttons/FormBtn";
import request from "../../Utils/AxiosUtils";
import { product } from "../../Utils/AxiosUtils/API";
import { YupObject, nameSchema } from "../../Utils/Validation/ValidationSchemas";
import Loader from "../CommonComponent/Loader";
import TabTitle from "../Coupon/TabTitle";
import { ProductInitValues, ProductValidationSchema } from "./ProductObjects";
import ProductSubmitFunction from "./ProductSubmitFunction";
import SettingContext from "../../Helper/SettingContext";
import AllProductTabs from "./AllProductTabs";
import I18NextContext from "@/Helper/I18NextContext";
import { useTranslation } from "@/app/i18n/client";

const ProductForm = ({ mutate, loading, updateId, title }) => {
  const { i18Lang } = useContext(I18NextContext);
  const { t } = useTranslation(i18Lang, 'common');
  const [activeTab, setActiveTab] = useState("1");
  const { state } = useContext(SettingContext);
  const searchParams = useSearchParams();
  const { data: oldData, isLoading: oldDataLoading, refetch, status } = useQuery([updateId, loading], () => request({ url: `${product}/${updateId}` }), { refetchOnWindowFocus: false, enabled: false, select: (data) => data.data });

  useEffect(() => {
    // const {tab} = router.query;
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [])

  useEffect(() => {
    if (updateId) {
      refetch();
    }
  }, [updateId, loading]);
  const watchEvent = useCallback((oldData, updateId) => {
    return ProductInitValues(oldData, updateId)
  }, [oldData, updateId])

  if ((updateId && oldDataLoading)) return <Loader />;
  return (
    <Formik
      initialValues={{ ...watchEvent(oldData, updateId) }}
      validationSchema={YupObject({
        ...ProductValidationSchema
        // store_id: state?.isMultiVendor && nameSchema
      })}
      onSubmit={(values) => {
        if (updateId) {
          values["_method"] = "put"
        }
        ProductSubmitFunction(mutate, values, updateId);
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
                    <TabTitle activeTab={activeTab} setActiveTab={setActiveTab} titleList={ProductTabTitleListData} errors={errors} touched={touched} />
                  </Col>
                  <AllProductTabs values={values} activeTab={activeTab} setFieldValue={setFieldValue} errors={errors} updateId={updateId} />
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

export default ProductForm;