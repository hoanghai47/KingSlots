var NetworkManager = require('NetworkManager');
var CommonPopup = require('CommonPopup');
var MAIL_RECEIVED = 1;
var MAIL_SENT = 2;
var MAIL_SENT_ADMIN = 3;
var MAX_RESULT = 20;
var firstResult = -1;
var PopupMail = cc.Class({
    extends: CommonPopup,

    properties: {
        mailType: 1,
        nodeSendAdmin: cc.Node,
        title: cc.EditBox,
        content: cc.EditBox,
        nodeMail: cc.Prefab,
        nodeMailContent: cc.Node
    },
    statics: {
        instance: null
    },
    onLoad: function () {
        PopupMail.instance = this;
        this.tableView.active = true;
        this.nodeSendAdmin.active = false;
        this.nodeMailContent.active = false;
    },

    start: function () {
    },

    addTabs: function (tabs, index) {
        this.initTabs(tabs, index);
    },

    initTabs: function (tabs, index) {
        this._super(tabs, index);
    },

    onGameEvent: function() {
        var self = this;
        NetworkManager.checkEvent(function(buffer) {
            return self.handleMessage(buffer);
        })
    },

    update: function(dt) {
        this.onGameEvent();
    },

    handleMessage: function(e) {
        const buffer = e;
        var isDone = true;
        switch (buffer.message_id) {
            case NetworkManager.MESSAGE_ID.FILTER_MAIL:
                var msg = buffer.response;
                this.filterEmailResponse(msg);
                break;
            case NetworkManager.MESSAGE_ID.SEND_MAIL:
                var msg = buffer.response;
                this.sendMailResponse(msg);
                break;
            case NetworkManager.MESSAGE_ID.DELETE_MAIL:
                var msg = buffer.response;
                this.deleteMailResponse(msg);
            case NetworkManager.MESSAGE_ID.READED_MAIL:
                var msg = buffer.response;
                this.readMailResponse(msg);
                break;
            case NetworkManager.MESSAGE_ID.CLAIM_ATTACH_ITEM:
                var msg = buffer.response;
                this.claimMailResponse(msg);
                break;
                isDone = false;
                break;
        }
        return isDone;
    },

    onEvent: function (index) {
        var self = this;
        if(index === MAIL_RECEIVED){
            NetworkManager.getFilterMailFromServer(0, MAX_RESULT, -1, false);
            this.setMailType(index);
        } else if(index === MAIL_SENT){
            cc.log("MAIL_SENT =", index);
            NetworkManager.getFilterMailFromServer(0, MAX_RESULT, -1, true);
            this.setMailType(index);
        } else if(index === MAIL_SENT_ADMIN){
            self.tableView.active = false;
            self.nodeSendAdmin.active = true;
            self.nodeMailContent.active = false;
        }

    },

    filterEmailResponse: function(response){
        cc.log("response =", response);
        var self = this;
        self.tableView.active = true;
        self.nodeSendAdmin.active = false;
        self.nodeMailContent.active = false;
        self.nodeMailContent.removeAllChildren(true);
        if (response !== 0){
            if (response.getResponsecode()){
                // self.tableView.removeAllChildren();
                var lstMail = [];
                var binMail;
                for (var i = 0; i < response.getMailsList().length; i++) {
                    binMail = this.parseFromBinMail(response.getMailsList()[i]);
                    lstMail.push(binMail);
                }
                // loadEmail(lstEmail);

                var number = response.getMailsList().length;
                var data = this._getdata(lstMail, number);

                this.setListMail(data);

                this.reloadEmail(data);
                // self.tableView.getComponent(cc.tableView).initTableView(data.length, { array: data, target: this });

            }
            else {
                Common.showToast(response.getMessage(), 2);
            }
        }
    },

    _getdata: function (val, num) {
        var array = [];
        cc.log("val =", val);
        cc.log("num =", num);
        if(val !== null){
            for (var i = 0; i < num; ++i) {
                var obj = {};
                obj.mail_title = val[i].getTitle();
                obj.mail_sender = val[i].getSenderusername();
                obj.mail_senttime = val[i].getSenttime();
                obj.mail_id = val[i].getMailid();
                array.push(obj);
            }
        }

        return array;
    },

    parseFromBinMail: function(binMail){
        var mailResult = new proto.BINMail();
        mailResult.setMailid(binMail.getMailid());
        mailResult.setSenderuserid(binMail.getSenderuserid());
        mailResult.setSenderusername(binMail.getSenderusername());
        mailResult.setRecipientuserid(binMail.getRecipientuserid());
        mailResult.setRecipientusername(binMail.getRecipientusername());
        mailResult.setTitle(binMail.getTitle());
        mailResult.setBody(binMail.getBody());
        mailResult.setExpandeddata(binMail.getExpandeddata());

        mailResult.setSenttime(binMail.getSenttime());
        mailResult.setReaded(binMail.getReaded());
        mailResult.setAttachitemid(binMail.getAttachitemid());
        mailResult.setAttachitemquatity(binMail.getAttachitemquatity());

        mailResult.setExpiredtime(binMail.getExpiredtime());
        return mailResult;
    },

    setMailType: function (mailType) {
        this.mailType = mailType;
    },

    onSendAdminEvent: function () {
        var title_str = this.title.string;
        var content_str = this.content.string;

        if (title_str !== null && content_str !== null){

            NetworkManager.sendMail(1000000, title_str, content_str, 0);
        } else {
            Common.showToast(Common.KEYTEXT.BLANK_USERNAME);
        }
    },

    onCancelEvent: function () {
        this.title.string = '';
        this.content.string = '';
    },

    sendMailResponse: function(response){
        if (response !== 0){
            if (response.hasMessage()){
                Common.showToast(response.getMessage(), 3);
                this.title.string = '';
                this.content.string = '';
            }
        }
    },

    deleteMailResponse: function(response){
        if (response.hasMessage()){
            Common.showToast(response.getMessage(), 3);
        }
    },

    reloadEmail: function (data) {
        var self = this;
        self.tableView.getComponent(cc.tableView).initTableView(data.length, { array: data, target: this });
    },

    convertDataToObject: function () {

    },

    setListMail: function (data) {
        this.lstEmail = data;
    },

    setReadMailIndex: function (index) {
        this.index = index;
    },

    setReadMailComponent: function (mail) {
        this.readMailComponent = mail;
    },
    
    deleteMail: function (index) {

        var data = this.lstEmail;

        var mailIdDelete = data[index].mail_id;
        var lstEmailIdDelete = [];
        lstEmailIdDelete.push(mailIdDelete);
        NetworkManager.deleteMail(lstEmailIdDelete);

        // delete data[index];
        data.splice(index, 1);

        this.setListMail(data);

        this.reloadEmail(data);
    },
    
    readMail: function (mailId, index) {
        this.setReadMailIndex(index);
        NetworkManager.readMail(mailId, true);
    },

    readMailResponse: function(response){
        if (response !== 0){
            if (response.getResponsecode()){
                if (response.hasMail()){
                    var binMail = this.parseFromBinMail(response.getMail());
                    this.setReadMailComponent(binMail);
                    cc.log("binMail =", binMail);
                    //hien thi mail len giao dien
                    this.showReadMail(binMail);
                }
            }

            if (response.hasMessage()){
                Common.showToast(response.getMessage());
            }
        }
    },

    showReadMail: function (binMail) {
        this.tableView.active = false;
        this.nodeMailContent.active = true;
        this.nodeSendAdmin.active = false;
        // var title = binMail.getTitle();
        // var sender = binMail.getSenderusername();
        // var content = binMail.getBody();
        // var attachitemid = binMail.getAttachitemid();
        // cc.log("mail =", binMail);
        var item = cc.instantiate(this.nodeMail);
        item.getComponent('NodeMail').init(binMail);
        this.nodeMailContent.addChild(item);
    },

    claimMailResponse: function(response){
        cc.log("response claim =", response);
        if (response !== 0){
            if (response.getResponsecode()){
                // vector<long> lstMail;
                this.deleteMail(this.index); //xoa mail
                var readMail = this.readMailComponent;
                if (response.hasMessage() && readMail.getMailid() > 0 && readMail.getAttachitemid() > 0){
                    if (readMail.getAttachitemid() === 3){
                        // NodeDailyGift* gift = new NodeDailyGift(mail_clicked.getTitle(), response->message());
                        // this->addChild(gift, INDEX_POPUP);
                        Common.showToast(response.getMessage(), 3);
                    }
                    else {

                        // auto scene = cocos2d::Director::getInstance()->getRunningScene()->getChildByTag(TAG_CURRENT_SCENE);
                        // if (scene != nullptr && scene->getChildByTag(TAG_POPUP_CAPTCHA) != nullptr) {
                        //     scene->removeChildByTag(TAG_POPUP_CAPTCHA);
                        // }
                        this.disappear();

                        Common.showToast(response.getMessage(), 3);
                    }
                }
            }
            else if (response.hasMessage()){
                Common.showToast(response.getMessage(), 3);
            }
        }
    }
});
