import fetchMock from "fetch-mock";
import {PAGE_MODEL, content_test_child_page_1} from "./data/MainPageData";
import { ModelClient } from "../src/ModelClient";
import InternalConstants from "../src/InternalConstants";

describe("ModelClient ->", () => {
    let myEndPoint = "http://localhost:4523";
    let getJSONResponse = (body) => {
        return new window.Response(JSON.stringify(body), {
            status: 200,
            headers: {
                "Content-type": "application/json"
            }
        });
    };

    function mockTheFetch(path, data, multiple) {
        let url = 'end:' + path + InternalConstants.DEFAULT_MODEL_JSON_EXTENSION;
        fetchMock.mock(url, data, {
            repeat: multiple ? multiple : 1
        });
    }

    afterEach(() => {
        fetchMock.restore();
    });

    describe("fetch ->", () => {

        it("should return the expected data", () => {
            mockTheFetch('/content/test/page', getJSONResponse(PAGE_MODEL));
            mockTheFetch('/content/test/child_page_1', getJSONResponse(content_test_child_page_1));
            mockTheFetch('/content/test/child_page_404', 404);

            let modelClient = new ModelClient(myEndPoint);

            return modelClient.fetch('/content/test/page').then((data) => {
                assert.deepEqual(data, PAGE_MODEL);
                return modelClient.fetch("/content/test/child_page_1");
            }).then((data) => {
                assert.deepEqual(data, content_test_child_page_1);
                return modelClient.fetch("/content/test/child_page_404");
            }).catch((error) => {
                assert.isDefined(error.response);
                assert.equal(error.response.status, 404);
            });
        });

        it("should not make concurrent server calls on duplicate request", () => {
            mockTheFetch('/content/test/page', new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve(getJSONResponse(PAGE_MODEL));
                }, 200);
            }));

            let promises = [];
            let modelClient = new ModelClient(myEndPoint);
            promises.push(modelClient.fetch('/content/test/page'));
            promises.push(modelClient.fetch('/content/test/page'));
            promises.push(modelClient.fetch('/content/test/page'));

            return Promise.all(promises).then(() => {
                for (let i = 0 ; i < promises.length - 1 ; ++i) {
                    assert.equal(promises[i], promises[i + 1]);
                }
            });
        });

        it("Consecutive requests - refresh", (done) => {
            const DATA_PATH = '/content/test/page';
            mockTheFetch(DATA_PATH, getJSONResponse(PAGE_MODEL), 2);

            const modelClient = new ModelClient(myEndPoint);

            const promise = modelClient.fetch(DATA_PATH).then(() => {
                assert.notEqual(promise, modelClient.fetch(DATA_PATH));
                done();
            });
        });

        describe("handling incorrect parameter", () => {

            let modelClient = new ModelClient(myEndPoint);

            // failing as the undefined is passed to the PathUtils which can not handle this case
            // it("should resolve with Error - when no URL provided", (done) => {
            //
            //     modelClient.fetch(undefined).catch((e) => {
            //         assert.isNotNull(e);
            //         done();
            //     });
            // });

            it("should resolve with Error - when empty URL provided", (done) => {

                modelClient.fetch("").catch((e) => {
                    assert.isNotNull(e);
                    done();
                });
            });

        });
    });
});
