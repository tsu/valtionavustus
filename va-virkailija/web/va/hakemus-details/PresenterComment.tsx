import React from "react";

import HelpTooltip from "../HelpTooltip";
import {
  useHakemustenArviointiDispatch,
  useHakemustenArviointiSelector,
} from "../hakemustenArviointi/arviointiStore";
import {
  getSelectedHakemus,
  setArvioValue,
  startHakemusArvioAutoSave,
} from "../hakemustenArviointi/arviointiReducer";

type PresenterCommentProps = {
  helpText: string;
};

const PresenterComment = ({ helpText }: PresenterCommentProps) => {
  const dispatch = useHakemustenArviointiDispatch();
  const hakemus = useHakemustenArviointiSelector(getSelectedHakemus);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    dispatch(
      setArvioValue({
        hakemusId: hakemus.id,
        key: "presentercomment",
        value,
      })
    );
    dispatch(startHakemusArvioAutoSave({ hakemusId: hakemus.id }));
  };
  return (
    <div className="value-edit">
      <label>
        Valmistelijan huomiot
        <HelpTooltip content={helpText} direction={"valmistelijan-huomiot"} />
      </label>
      <textarea
        rows={5}
        value={hakemus.arvio.presentercomment ?? ""}
        onChange={onChange}
      ></textarea>
    </div>
  );
};

export default PresenterComment;
