import { NoteQuestionParser } from "src/NoteQuestionParser";
import { DEFAULT_SETTINGS, SRSettings } from "src/settings";
import { TopicPath } from "src/TopicPath";
import { TextDirection } from "src/util/TextDirection";
import { UnitTestSRFile } from "../helpers/UnitTestSRFile";

describe("Header-Based Debug", () => {
    test("Debug header-based card creation", async () => {
        const settings: SRSettings = {
            ...DEFAULT_SETTINGS,
            enableHeaderBasedCards: true,
            headerCardBaseConfig: {
                headingLevels: [2],
                mode: "qa",
                nestingMode: "nested",
            },
            headerCardCustomTags: {},
            headerCardShowContext: true,
        };
        
        const parser = new NoteQuestionParser(settings);

        const noteText = `#flashcards

## What is React?
React is a JavaScript library.
`;
        const noteFile = new UnitTestSRFile(noteText);
        const questionList = await parser.createQuestionList(
            noteFile,
            TextDirection.Ltr,
            TopicPath.emptyPath,
            true,
        );

        console.log("Question list length:", questionList.length);
        console.log("Questions:", JSON.stringify(questionList.map(q => ({
            isHeaderBased: q.isHeaderBased,
            questionType: q.questionType,
            text: q.questionText.actualQuestion,
            headingContext: q.headingContext
        })), null, 2));

        expect(questionList.length).toBeGreaterThan(0);
    });
});
