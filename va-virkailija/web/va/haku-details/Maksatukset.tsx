import moment from "moment";
import React, { useEffect, useState } from "react";

import HttpUtil from "soresu-form/web/HttpUtil";
import { fiShortFormat } from "soresu-form/web/va/i18n/dateformat";
import { EnvironmentApiResponse } from "soresu-form/web/va/types/environment";

import HakujenHallintaController, {
  SelectedAvustushaku,
} from "../HakujenHallintaController";
import {
  HakemusV2WithEvaluation,
  PaymentBatchV2,
  PaymentV2,
  UserInfo,
  VaCodeValue,
} from "../types";

import "./Maksatukset.less";
import { MaksatuksetTable } from "./MaksatuksetTable";

type MaksatuksetProps = {
  avustushaku: SelectedAvustushaku;
  codeValues: VaCodeValue[];
  controller: HakujenHallintaController;
  environment: EnvironmentApiResponse;
  userInfo: UserInfo;
};

type MaksatuksetTab = "outgoing" | "sent";

export type Maksatus = PaymentV2 & {
  hakemus?: HakemusV2WithEvaluation;
};

const isSent = (p: Maksatus) =>
  ["sent", "paid"].includes(p["paymentstatus-id"]);
const today = moment().format(fiShortFormat);
const isToday = (p: Maksatus) =>
  moment(p["created-at"]).format(fiShortFormat) === today;

export const Maksatukset = ({
  avustushaku,
  codeValues,
  controller,
  environment,
  userInfo,
}: MaksatuksetProps) => {
  const [tab, setTab] = useState<MaksatuksetTab>("outgoing");
  const [maksatukset, setMaksatukset] = useState<Maksatus[]>([]);
  const [batches, setBatches] = useState<PaymentBatchV2[]>([]);

  const refreshPayments = async () => {
    const [hakemukset, payments, batches] = await Promise.all([
      HttpUtil.get<HakemusV2WithEvaluation[]>(
        `/api/v2/grants/${avustushaku.id}/applications/?template=with-evaluation`
      ),
      HttpUtil.get<PaymentV2[]>(`/api/v2/grants/${avustushaku.id}/payments/`),
      HttpUtil.get<PaymentBatchV2[]>(
        `/api/v2/grants/${avustushaku.id}/batches/`
      ),
    ]);
    setMaksatukset(
      payments.map((p) => {
        const hakemus = hakemukset.find(
          (h) =>
            h.id === p["application-id"] &&
            h.version === p["application-version"]
        );
        return { ...p, hakemus };
      })
    );
    setBatches(batches);
  };

  useEffect(() => {
    void refreshPayments();
  }, [avustushaku.id]);

  const newSentPayments = maksatukset?.filter((p) => isSent(p) && isToday(p));

  return (
    <div className="maksatukset">
      <div className="maksatukset_avustushaku">
        <h2>{avustushaku.content.name.fi}</h2>
        <div className="maksatukset_avustushaku-info">
          <div>
            <label>Toimintayksikkö</label>
            <div>
              {
                codeValues.find(
                  (c) => c.id === avustushaku["operational-unit-id"]
                )?.code
              }
            </div>
          </div>
          <div>
            <label>Projekti</label>
            <div>
              {codeValues.find((c) => c.id === avustushaku["project-id"])?.code}
            </div>
          </div>
          <div>
            <label>Toiminto</label>
            <div>
              {
                codeValues.find((c) => c.id === avustushaku["operation-id"])
                  ?.code
              }
            </div>
          </div>
          <div>
            <label>Maksuliikemenotili</label>
            <div>{avustushaku.content["transaction-account"]}</div>
          </div>
          <div>
            <label>Tositelaji</label>
            <div>{avustushaku.content["document-type"]}</div>
          </div>
        </div>
      </div>
      <div className="maksatukset_tabs">
        <a
          className={`maksatukset_tab ${tab === "outgoing" ? "active" : ""}`}
          onClick={() => setTab("outgoing")}
        >
          Lähtevät maksatukset
        </a>
        <a
          className={`maksatukset_tab ${tab === "sent" ? "active" : ""}`}
          onClick={() => setTab("sent")}
        >
          Lähetetyt maksatukset
          {newSentPayments?.length ? (
            <span className="maksatukset_badge">
              {newSentPayments?.length} uutta
            </span>
          ) : (
            ""
          )}
        </a>
      </div>
      {tab === "sent" && (
        <MaksatuseräTable batches={batches} maksatukset={maksatukset} />
      )}
      <MaksatuksetTable
        payments={maksatukset?.filter((p) =>
          tab === "sent" ? isSent(p) : !isSent(p)
        )}
      />
      <div className="maksatukset_report">
        <a
          target="_blank"
          href={`/api/v2/reports/tasmaytys/avustushaku/${avustushaku.id}`}
        >
          Lataa täsmäytysraportti
        </a>
      </div>
      {userInfo.privileges.includes("va-admin") && (
        <AdminTools
          avustushaku={avustushaku}
          controller={controller}
          environment={environment}
          refreshPayments={refreshPayments}
        />
      )}
    </div>
  );
};

type MaksatuseräTable = {
  batches: PaymentBatchV2[];
  maksatukset: Maksatus[];
};

const MaksatuseräTable = ({ batches, maksatukset }: MaksatuseräTable) => {
  let i = 0;
  return (
    <>
      <table className="maksatukset_payments-table">
        <thead>
          <th>Vaihe</th>
          <th>Yhteensä</th>
          <th>Maksatuksia</th>
          <th>Laskupvm</th>
          <th>Eräpvm</th>
          <th>Tositepäivä</th>
          <th>Allekirjoitettu yhteenveto</th>
          <th>Esittelijän sähköpostiosoite</th>
          <th>Hyväksyjän sähköpostiosoite</th>
        </thead>
        <tbody>
          {batches.map((b) => (
            <>
              {b.documents.map((d) => {
                const payments = maksatukset.filter(
                  (m) => m["batch-id"] === b.id && m.phase === d.phase
                );
                return (
                  <tr className={i % 2 === 0 ? "white" : "gray"}>
                    <td>{d.phase + 1}. erä</td>
                    <td>
                      {payments.reduce((a, c) => a + c["payment-sum"], 0)}
                    </td>
                    <td>{payments.length}</td>
                    <td>{moment(b["invoice-date"]).format(fiShortFormat)}</td>
                    <td>{moment(b["due-date"]).format(fiShortFormat)}</td>
                    <td>{moment(b["receipt-date"]).format(fiShortFormat)}</td>
                    <td>{d["document-id"]}</td>
                    <td>{d["presenter-email"]}</td>
                    <td>{d["acceptor-email"]}</td>
                  </tr>
                );
              })}
            </>
          ))}
        </tbody>
      </table>
      {batches.length === 0 && (
        <div className="maksatukset_no-payments">Ei maksueriä</div>
      )}
    </>
  );
};

type AdminToolsProps = {
  avustushaku: SelectedAvustushaku;
  controller: HakujenHallintaController;
  environment: EnvironmentApiResponse;
  refreshPayments: () => Promise<void>;
};

const AdminTools = ({
  avustushaku,
  controller,
  environment,
  refreshPayments,
}: AdminToolsProps) => {
  const onPoistaMaksatukset = async () => {
    const really = window.confirm(
      "Oletko varma, että haluat poistaa kaikki haun maksatukset?"
    );
    if (really) {
      controller.startSave();
      await HttpUtil.delete(`/api/v2/grants/${avustushaku.id}/payments/`);
      await refreshPayments();
      controller.completeSave();
    }
  };

  const onLuoMaksatukset = async () => {
    controller.startSave();
    await HttpUtil.post(`/api/v2/grants/${avustushaku.id}/payments/`, {
      phase: 0,
    });
    await refreshPayments();
    controller.completeSave();
  };

  return (
    <div>
      <hr className="spacer" />
      <h2>Pääkäyttäjän työkalut</h2>
      <button onClick={onLuoMaksatukset}>Luo maksatukset</button>
      {environment.payments["delete-payments?"] && (
        <>
          &nbsp;
          <button onClick={onPoistaMaksatukset}>Poista maksatukset</button>
        </>
      )}
    </div>
  );
};
