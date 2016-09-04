/**
 * Created by f.van.rijswijk on 4-9-2015.
 */

/**
 * Template mapping which can be override in templates
 */


(function (blueriq){
    'use strict';

    var templateRoot = 'themes/bootstrap3/template/';
    blueriq.templates = {
        aggregateList: {
            alFooter: templateRoot+'aggregatelist/al_footer',
            alHeader: templateRoot+'aggregatelist/al_header',
            alheaderCell: templateRoot+'aggregatelist/al_headercell',
            alSearchBoolean: templateRoot+'aggregatelist/al_search_boolean',
            alSearchDate: templateRoot+'aggregatelist/al_search_date',
            alSearchDateTime: templateRoot+'aggregatelist/al_search_datetime',
            alSearchDomain: templateRoot+'aggregatelist/al_search_domain',
            alSearchInteger: templateRoot+'aggregatelist/al_search_integer',
            alSearchNumeric: templateRoot+'aggregatelist/al_search_numeric',
            alSearchText: templateRoot+'aggregatelist/al_search_text'
        },
        asset: {
            asset: templateRoot+'asset/asset'
        },
        button: {
            button: templateRoot+'button/button',
            buttonLink: templateRoot+'button/buttonlink',
            buttonPrimary: templateRoot+'button/buttonprimary',
            iconButton: templateRoot+'button/iconbutton',
            iconOnlyButton: templateRoot+'button/icononlybutton'
        },
        comment: {
            commentList: templateRoot+'comment/commentlist',
            storeComment: templateRoot+'comment/storecomment'
        },
        container: {
            dashboard: {
                dashboardBody: templateRoot+'container/dashboard/dashboard-body',
                dashboardFooter: templateRoot+'container/dashboard/dashboard-footer',
                dashboardHeader: templateRoot+'container/dashboard/dashboard-header',
                dashboardMenu: templateRoot+'container/dashboard/dashboard-menu'
            },
            table: {
                table: templateRoot+'container/table/table',
                tableCell: templateRoot+'container/table/tablecell',
                tableHeader: templateRoot+'container/table/tableheader',
                tableNavigation: templateRoot+'container/table/tablenavigation',

                // todo: check if we can remove this template because it's not used anymore
                // todo: or see if we can use this template again for convenience. It makes sense to have a tablerow
                tableRow: templateRoot+'container/table/tablerow',

                tableSearch: templateRoot+'container/table/tablesearch',
                tableSortedHeader: templateRoot+'container/table/tablesortedheader',
                tableTextCell: templateRoot+'container/table/tabletextcell'
            },
            breadcrumb: templateRoot+'container/breadcrumb',
            column: templateRoot+'container/column',
            container: templateRoot+'container/container',
            easyPieChart: templateRoot+'container/easy-pie-chart',
            externalContent: templateRoot+'container/externalcontent',
            fileDownload: templateRoot+'container/filedownload',
            fileUpload: templateRoot+'container/fileupload',
            formFooter: templateRoot+'container/formfooter',
            inlineGroup: templateRoot+'container/inlinegroup',
            instanceLinker: templateRoot+'container/instancelinker',
            instanceList: templateRoot+'container/instancelist',
            menubar: templateRoot+'container/menubar',
            navbar: templateRoot+'container/navbar',
            row: templateRoot+'container/row',
            tabs: templateRoot+'container/tabs',
            timeline: templateRoot+'container/timeline',
            widget: templateRoot+'container/widget'
        },
        contentItem: {
            contentItem: templateRoot+'contentitem/contentitem'
        },
        error: {
            noTemplate: templateRoot+'error/notemplate'
        },
        failedElement: {
            failedElement: templateRoot+'failedelement/failedelement'
        },
        field: {
            booleanfield: templateRoot+'field/booleanfield',
            checkboxHorizontal: templateRoot+'field/checkboxhorizontal',
            checkboxVertical: templateRoot+'field/checkboxvertical',
            currency: templateRoot+'field/currency',
            date: templateRoot+'field/date',
            dateTime: templateRoot+'field/datetime',
            domainMulti: templateRoot+'field/domainmulti',
            domainSingle: templateRoot+'field/domainsingle',
            field: templateRoot+'field/field',
            fieldHorizontal: templateRoot+'field/fieldhorizontal',
            filetypeField: templateRoot+'field/filetypefield',
            integer: templateRoot+'field/integer',
            memo: templateRoot+'field/memo',
            number: templateRoot+'field/number',
            password: templateRoot+'field/password',
            percentage: templateRoot+'field/percentage',
            radioHorizontal: templateRoot+'field/radiohorizontal',
            radioVertical: templateRoot+'field/radiovertical',
            readonly: templateRoot+'field/readonly',
            readonlyHorizontal: templateRoot+'field/readonlyhorizontal',
            readonlyValue: templateRoot+'field/readonlyvalue',
            text: templateRoot+'field/text',
            toggle: templateRoot+'field/toggle',
            value: templateRoot+'field/value'
        },
        fileDownload: {
            cmis: {
                fileDownloadLink: templateRoot+'filedownload/cmis/filedownload-link'
            }
        },
        flowWidget: {
            flowWidget: templateRoot+'flowwidget/flowwidget'
        },
        image: {
            image: templateRoot+'image/image'
        },
        link: {
            link: templateRoot+'link/link'
        },
        notification: {
            notification: templateRoot+'notification/notification-modal'
        },
        page: {
            dashboardPage: templateRoot+'page/dashboardpage',
            page: templateRoot+'page/page',
            widgetPage: templateRoot+'page/widgetpage'
        },
        statistic: {
            statistic: templateRoot+'statistic/statistic',
            visualization: templateRoot+'statistic/visualization',
            visualizationWithLegend: templateRoot+'statistic/visualizationwithlegend'
        },
        textItem: {
            authenticatedUser: templateRoot+'textitem/authenticateduser',
            danger: templateRoot+'textitem/danger',
            info: templateRoot+'textitem/info',
            label: templateRoot+'textitem/label',
            logout: templateRoot+'textitem/logout',
            node: templateRoot+'textitem/node',
            plaintext: templateRoot+'textitem/plaintext',
            styled: templateRoot+'textitem/styled',
            succes: templateRoot+'textitem/success',
            textitem: templateRoot+'textitem/textitem',
            warning: templateRoot+'textitem/warning'
        },
        unknown: {
            unknown: templateRoot+'unknown/unknown'
        },
        webfileupload: {
            webfileupload: templateRoot+'webfileupload/webfileupload'
        }
    };

})(window.blueriq);