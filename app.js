"use strict";
const fs = require("fs");
let rawdata = fs.readFileSync("./bkstr/bkstr_acadiastore_100070921_APSC_2920L_1.json");
let cmdata = JSON.parse(rawdata);
var len = cmdata.length;
const csvToJsonData = require("csvtojson");
const jsonToCsvData = require("json2csv").parse;
const fileSys = require("fs");
csvToJsonData()
    .fromFile("./csv/bkstr.csv")
    .then((source) => {
        cmdata.forEach(function (val, index) {
            const row = getBlankRow();
            // console.log(val["storeId"]);
            row["storeid"] = val.storeId;
            row["storenumber"] = val.storeNumber;
            row["storedisplayname"] = val.storeDisplayName;
            // console.log(row);
            if(!val.courseSectionDTO){
              source.push(row);
            }else{
              val.courseSectionDTO.forEach(function (val2, index2) {
                const row1 = getBlankRow();
                row1["storeid"] = val.storeId;
                row1["storenumber"] = val.storeNumber;
                row1["storedisplayname"] = val.storeDisplayName;
                row1["termid"] = val2.termId;
                row1["termname"] = val2.termName;
                row1["termnumber"] = val2.termNumber;
                row1["programid"] = val2.programId;
                row1["programname"] = val2.programName;
                row1["campusid"] = val2.campusId;
                row1["campusname"] = val2.campusName;
                row1["department"] = val2.department;
                row1["departmentname"] = val2.departmentName;
                row1["division"] = val2.division;
                row1["divisionname"] = val2.divisionName;
                row1["courseid"] = val2.courseId;
                row1["coursename"] = val2.courseName;
                row1["section"] = val2.section;
                row1["sectionname"] = val2.sectionName;
                row1["instructor"] = val2.instructor;
                row1["schoolname"] = val2.institutionName;
                // console.log(row);
                if(!val2.courseMaterialResultsList){
                  source.push(row1);
                }else{
                  val2.courseMaterialResultsList.forEach(function(val3,index3){
                    const row2 = getBlankRow();
                    row2["storeid"] = val.storeId;
                    row2["storenumber"] = val.storeNumber;
                    row2["storedisplayname"] = val.storeDisplayName;
                    row2["termid"] = val2.termId;
                    row2["termname"] = val2.termName;
                    row2["termnumber"] = val2.termNumber;
                    row2["programid"] = val2.programId;
                    row2["programname"] = val2.programName;
                    row2["campusid"] = val2.campusId;
                    row2["campusname"] = val2.campusName;
                    row2["department"] = val2.department;
                    row2["departmentname"] = val2.departmentName;
                    row2["division"] = val2.division;
                    row2["divisionname"] = val2.divisionName;
                    row2["courseid"] = val2.courseId;
                    row2["coursename"] = val2.courseName;
                    row2["section"] = val2.section;
                    row2["sectionname"] = val2.sectionName;
                    row2["instructor"] = val2.instructor;
                    row2["schoolname"] = val2.institutionName;
                    row2["cmid"] = val3.cmId;
                    row2["mtcid"] = val3.mtcId;
                    row2["bookimage"] = val3.bookImage;
                    row2["title"] = val3.title;
                    row2["edition"] = val3.edition;
                    row2["author"] = val3.author;
                    row2["isbn"] = val3.isbn;
                    row2["materialtype"] = val3.materialType;
                    row2["requirementtype"] = val3.requirementType;
                    row2["publisher"] = val3.publisher;
                    row2["publishercode"] = val3.publisherCode;
                    row2["productcatentryid"] = val3.productCatentryId;
                    row2["copyrightyear"] = val3.copyRightYear||"";
                    row2["pricerangedisplay"] = val3.priceRangeDisplay;
                    source.push(row2);
                  })
                }
              });
            }
        });
        const csv = jsonToCsvData(source,{fields:["storeid","storenumber","storedisplayname","termid","termname","termnumber","programid","programname","campusid","campusname","department","departmentname","division","divisionname","courseid","coursename","section","sectionname","instructor","schoolname","cmid","mtcid","bookimage","title","edition","author","isbn","materialtype","requirementtype","publisher","publishercode","productcatentryid","copyrightyear","pricerangedisplay"]});
        fileSys.writeFileSync("./csv/bkstr.csv",csv);
    });
function getBlankRow() {
    return {
        storeid: "",
        storenumber: "",
        storedisplayname: "",
        termid:"",
        termname:"",
        termnumber:"",
        programid:"",
        programname:"",
        campusid:"",
        campusname:"",
        department:"",
        departmentname:"",
        division:"",
        divisionname:"",
        courseid:"",
        coursename:"",
        section:"",
        sectionname:"",
        instructor:"",
        schoolname:"",
        cmid:"",
        mtcid:"",
        bookimage:"",
        title:"",
        edition:"",
        author:"",
        isbn:"",
        materialtype:"",
        requirementtype:"",
        publisher:"",
        publishercode:"",
        productcatentryid:"",
        copyrightyear:"",
        pricerangedisplay:""
    };
}
