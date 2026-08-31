export interface IdGenerator {
  uuid(): string;
  /** The ck_… token echoed in ?xu= (§4.1). */
  clickId(): string;
}
