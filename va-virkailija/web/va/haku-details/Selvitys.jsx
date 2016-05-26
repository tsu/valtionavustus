import React, { Component } from 'react'
import moment from 'moment'

export default class Selvitys extends React.Component{
  render(){
    const {controller, avustushaku} = this.props
    const onSendLoppuselvitys = () => controller.sendSelvitysEmails(avustushaku, 'loppuselvitys')
    const onSendValiselvitys = () => controller.sendSelvitysEmails(avustushaku, 'valiselvitys')
    return (
      <div>
        <h4>Väliselvitys</h4>
        <div>
          Väliselvitys toimitettava viimeistään
          <DateField {...this.props} field="valiselvitysdate"/>
          <p>
            <div>Väliselvitys avautuu täytettäväksi 2kk ennen eräpäivää</div>
            <span>Linkit lähetetään vain niille hakijoille, jotka eivät ole vielä vastanneet.</span>
          </p>
          <div>
            <button onClick={onSendValiselvitys}>Lähetä väliselvityslinkit</button>
          </div>
        </div>
        <h4>Loppuselvitys</h4>
        <div>
          Loppuselvitys toimitettava 2kk sisällä hankkeen päättymisestä tai viimeistään
          <DateField {...this.props} field="loppuselvitysdate"/>
          <p>
            <div>Loppuselvityslomake on koko ajan täytettävissä.</div>
            <div>Linkit lähetetään vain niille hakijoille, jotka eivät ole vielä vastanneet</div>
          </p>
          <div>
            <button onClick={onSendLoppuselvitys}>Lähetä loppuselvityslinkit</button>
          </div>
        </div>
      </div>
    )
  }
}


class DateField extends React.Component {
  constructor(props){
    super(props)
    const field = props.field
    this.state = {value: this.value(props,field),field:field}
  }

  value(props,field) {
    return _.get(props.avustushaku, field, "")
  }

  componentWillReceiveProps(nextProps) {
    if(nextProps.avustushaku.id!=this.props.avustushaku.id){
      this.setState({
        value: this.value(nextProps,nextProps.field)
      })
    }
  }

  render() {
    const onChange = (event)=>{
      this.setState({value:event.target.value,invalid:false})
    }

    const onBlur = (event)=>{
      const value = event.target.value
      const isValid = moment(value, ["D.M.YYYY"],true).isValid() || value==""
      if(isValid) {
        this.props.controller.onChangeListener(this.props.avustushaku, event.target, value)
      }
      else{
        this.setState({invalid:true})
      }
    }
    const field = this.state.field
    return (
      <span className="decision-date" style={{marginLeft:10,marginRight:10}}>
        <input type="text" className={this.state.invalid ? 'error' : ''} value={this.state.value} id={field} onChange={onChange} onBlur={onBlur}/>
      </span>
    )
  }
}