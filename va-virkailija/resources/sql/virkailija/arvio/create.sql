insert into arviot (hakemus_id, status, overridden_answers, budget_granted, summary_comment, changelog, roles, presenter_role_id, rahoitusalue, perustelut, costs_granted, use_overridden_detailed_costs, presentercomment, academysize, oppilaitokset)
values
  (:hakemus_id, :status, :overridden_answers, :budget_granted, :summary_comment, :changelog, :roles, :presenter_role_id,
   :rahoitusalue, :perustelut, :costs_granted, :use_overridden_detailed_costs, :presentercomment,:academysize, :oppilaitokset)
