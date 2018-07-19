import React, { Component } from "react";
import LoadLabel from "./LoadLabel.jsx";
import PropTypes from "prop-types";
import NodeCypherLink from "./NodeCypherLink.jsx";
import NodeCypherNoNumberLink from "./NodeCypherNoNumberLink";
import NodeCypherLinkComplex from "./NodeCypherLinkComplex";
import NodeProps from "./NodeProps";

export default class DomainNodeData extends Component {
    constructor() {
        super();

        this.state = {
            label: "",
            users: -1,
            groups: -1,
            computers: -1,
            ous: -1,
            gpos: -1,
            driversessions: [],
            propertyMap: {},
            displayMap: {
                "description":"Description",
                "functionallevel":"Domain Functional Level"
            },
            notes: null
        };

        emitter.on("domainNodeClicked", this.getNodeData.bind(this));
    }

    getNodeData(payload) {
        jQuery(this.refs.complete).hide();
        $.each(this.state.driversessions, function(index, record) {
            record.close();
        });

        this.setState({
            label: payload,
            users: -1,
            groups: -1,
            computers: -1,
            ous: -1,
            gpos: -1
        });

        let props = driver.session();
        props
            .run("MATCH (n:Domain {name:{name}}) RETURN n", { name: payload })
            .then(
                function(result) {
                    var properties = result.records[0]._fields[0].properties;
                    let notes;
                    if (!properties.notes){
                        notes = null;
                    }else{
                        notes = properties.notes;
                    }
                    this.setState({ propertyMap: properties, notes: notes });
                    props.close();
                }.bind(this)
            );

        let s1 = driver.session();
        let s2 = driver.session();
        let s3 = driver.session();
        let s4 = driver.session();
        let s5 = driver.session();

        s1.run("MATCH (a:User) WHERE a.domain={name} RETURN COUNT(a)", {
            name: payload
        }).then(
            function(result) {
                this.setState({ users: result.records[0]._fields[0].low });
                s1.close();
            }.bind(this)
        );

        s2.run("MATCH (a:Group) WHERE a.domain={name} RETURN COUNT(a)", {
            name: payload
        }).then(
            function(result) {
                this.setState({ groups: result.records[0]._fields[0].low });
                s2.close();
            }.bind(this)
        );

        s3.run("MATCH (n:Computer) WHERE n.domain={name} RETURN count(n)", {
            name: payload
        }).then(
            function(result) {
                this.setState({ computers: result.records[0]._fields[0].low });
                s3.close();
            }.bind(this)
        );

        s4.run("MATCH (n:OU {domain:{name}}) RETURN COUNT(n)", {
            name: payload
        }).then(
            function(result) {
                this.setState({ ous: result.records[0]._fields[0].low });
                s4.close();
            }.bind(this)
        );

        s5.run("MATCH (n:GPO {domain:{name}}) RETURN COUNT(n)", {
            name: payload
        }).then(
            function(result) {
                this.setState({ gpos: result.records[0]._fields[0].low });
                s5.close();
            }.bind(this)
        );

        this.setState({ driversessions: [s1, s2, s3] });
    }

    notesChanged(event){
        this.setState({notes: event.target.value})
    }

    notesBlur(event){
        let notes = this.state.notes === null || this.state.notes === "" ? null : this.state.notes;
        let q = driver.session();
        if (notes === null){
            q.run("MATCH (n:Domain {name:{name}}) REMOVE n.notes", {name: this.state.label}).then(x => {
                q.close();
            });
        }else{
            q.run("MATCH (n:Domain {name:{name}}) SET n.notes = {notes}", {name: this.state.label, notes: this.state.notes}).then(x =>{
                q.close();
            });
        }
        let check = jQuery(this.refs.complete);
        check.show();
        check.fadeOut(2000);
    }

    render() {
        return (
            <div className={this.props.visible ? "" : "displaynone"}>
                <dl className="dl-horizontal">
                    <dt>Domain</dt>
                    <dd>{this.state.label}</dd>
                    <NodeProps
                        properties={this.state.propertyMap}
                        displayMap={this.state.displayMap}
                        ServicePrincipalNames={[]}
                    />
                    <dt>Users</dt>
                    <dd>
                        <LoadLabel
                            ready={this.state.users !== -1}
                            value={this.state.users}
                        />
                    </dd>
                    <dt>Groups</dt>
                    <dd>
                        <LoadLabel
                            ready={this.state.groups !== -1}
                            value={this.state.groups}
                        />
                    </dd>
                    <dt>Computers</dt>
                    <dd>
                        <LoadLabel
                            ready={this.state.computers !== -1}
                            value={this.state.computers}
                        />
                    </dd>
                    <dt>OUs</dt>
                    <dd>
                        <LoadLabel
                            ready={this.state.ous !== -1}
                            value={this.state.ous}
                        />
                    </dd>
                    <dt>GPOs</dt>
                    <dd>
                        <LoadLabel
                            ready={this.state.gpos !== -1}
                            value={this.state.gpos}
                        />
                    </dd>
                    <NodeCypherNoNumberLink
                        target={this.state.label}
                        property="Map OU Structure"
                        query="MATCH p = (d:Domain {name:{name}})-[r:Contains*1..]->(n) RETURN p"
                    />
                    <br />
                    <h4>Foreign Members</h4>

                    <NodeCypherLink
                        property="Foreign Users"
                        target={this.state.label}
                        baseQuery={
                            "MATCH (n:User) WHERE NOT n.domain={name} WITH n MATCH (b:Group) WHERE b.domain={name} WITH n,b MATCH p=(n)-[r:MemberOf]->(b)"
                        }
                    />

                    <NodeCypherLink
                        property="Foreign Groups"
                        target={this.state.label}
                        baseQuery={
                            "MATCH (n:Group) WHERE NOT n.domain={name} WITH n MATCH (b:Group) WHERE b.domain={name} WITH n,b MATCH p=(n)-[r:MemberOf]->(b)"
                        }
                    />

                    <NodeCypherLink
                        property="Foreign Admins"
                        target={this.state.label}
                        baseQuery={
                            "MATCH (n) WHERE NOT n.domain={name} WITH n MATCH (b:Computer) WHERE b.domain={name} WITH n,b MATCH p=shortestPath((n)-[r:AdminTo|MemberOf*1..]->(b))"
                        }
                    />

                    <NodeCypherLink
                        property="Foreign GPO Controllers"
                        target={this.state.label}
                        baseQuery={
                            "MATCH (n) WHERE NOT n.domain={name} WITH n MATCH (b:GPO) WHERE b.domain={name} WITH n,b MATCH p=(n)-[r]->(b) WHERE r.isacl=true"
                        }
                    />

                    <h4>Inbound Trusts</h4>
                    <NodeCypherLink
                        property="First Degree Trusts"
                        target={this.state.label}
                        baseQuery={
                            "MATCH p=(a:Domain {name:{name}})<-[r:TrustedBy]-(n:Domain)"
                        }
                    />

                    <NodeCypherLink
                        property="Effective Inbound Trusts"
                        target={this.state.label}
                        baseQuery={
                            "MATCH (n:Domain) WHERE NOT n.name={name} WITH n MATCH p=shortestPath((a:Domain {name:{name}})<-[r:TrustedBy*1..]-(n))"
                        }
                    />

                    <h4>Outbound Trusts</h4>
                    <NodeCypherLink
                        property="First Degree Trusts"
                        target={this.state.label}
                        baseQuery={
                            "MATCH p=(a:Domain {name:{name}})-[r:TrustedBy]->(n:Domain)"
                        }
                    />

                    <NodeCypherLink
                        property="Effective Outbound Trusts"
                        target={this.state.label}
                        baseQuery={
                            "MATCH (n:Domain) WHERE NOT n.name={name} MATCH p=shortestPath((a:Domain {name:{name}})-[r:TrustedBy*1..]->(n))"
                        }
                    />

                    <h4>Inbound Controllers</h4>

                    <NodeCypherLink
                        property="First Degree Controllers"
                        target={this.state.label}
                        baseQuery={
                            "MATCH p=(n)-[r]->(u:Domain {name: {name}}) WHERE r.isacl=true"
                        }
                        distinct
                    />

                    <NodeCypherLink
                        property="Unrolled Controllers"
                        target={this.state.label}
                        baseQuery={
                            "MATCH p=(n)-[r:MemberOf*1..]->(g:Group)-[r1]->(u:Domain {name: {name}}) WHERE r1.isacl=true"
                        }
                        distinct
                    />

                    <NodeCypherLink
                        property="Transitive Controllers"
                        target={this.state.label}
                        baseQuery={
                            "MATCH p=shortestPath((n)-[r1:MemberOf|AllExtendedRights|GenericAll|GenericWrite|WriteDacl|WriteOwner|Owns*1..]->(u:Domain {name: {name}})) WHERE NOT n.name={name}"
                        }
                        distinct
                    />

                    <NodeCypherLinkComplex
                        property="Calculated Principals with DCSync Privileges"
                        target={this.state.label}
                        countQuery={
                            "MATCH (n1)-[:MemberOf|GetChanges*1..]->(u:Domain {name: {name}}) WITH n1 MATCH (n1)-[:MemberOf|GetChangesAll*1..]->(u:Domain {name: {name}}) WITH n1 MATCH (n2)-[:MemberOf|GenericAll|AllExtendedRights*1..]->(u:Domain {name: {name}}) WITH collect(distinct(n1))+collect(distinct(n2)) as results UNWIND results as x WITH x WHERE x:User OR x:Computer RETURN count(distinct(x))"
                        }
                        graphQuery={
                            "MATCH p=(n1)-[:MemberOf|GetChanges*1..]->(u:Domain {name: {name}}) WITH p,n1 MATCH p2=(n1)-[:MemberOf|GetChangesAll*1..]->(u:Domain {name: {name}}) WITH p,p2 MATCH p3=(n2)-[:MemberOf|GenericAll|AllExtendedRights*1..]->(u:Domain {name: {name}}) RETURN p,p2,p3"
                        }
                    />
                </dl>
                <div>
                    <h4 className={"inline"}>Notes</h4>
                    <i
                        ref="complete"
                        className="fa fa-check-circle green-icon-color notes-check-style"
                    />
                </div>
                <textarea onBlur={this.notesBlur.bind(this)} onChange={this.notesChanged.bind(this)} value={this.state.notes === null ? "" : this.state.notes} className={"node-notes-textarea"} ref="notes" />
            </div>
        );
    }
}

DomainNodeData.propTypes = {
    visible: PropTypes.bool.isRequired
};
