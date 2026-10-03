using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bookmachs.Refactored.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDoubleExchangeColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "OfferedBookId",
                table: "MatchTransactions",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "EnableDoubleExchange",
                table: "GlobalSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "DoubleExchangeCommitmentUntil",
                table: "Books",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDoubleExchangeCommitment",
                table: "Books",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_MatchTransactions_OfferedBookId",
                table: "MatchTransactions",
                column: "OfferedBookId");

            migrationBuilder.AddForeignKey(
                name: "FK_MatchTransactions_Books_OfferedBookId",
                table: "MatchTransactions",
                column: "OfferedBookId",
                principalTable: "Books",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MatchTransactions_Books_OfferedBookId",
                table: "MatchTransactions");

            migrationBuilder.DropIndex(
                name: "IX_MatchTransactions_OfferedBookId",
                table: "MatchTransactions");

            migrationBuilder.DropColumn(
                name: "OfferedBookId",
                table: "MatchTransactions");

            migrationBuilder.DropColumn(
                name: "EnableDoubleExchange",
                table: "GlobalSettings");

            migrationBuilder.DropColumn(
                name: "DoubleExchangeCommitmentUntil",
                table: "Books");

            migrationBuilder.DropColumn(
                name: "IsDoubleExchangeCommitment",
                table: "Books");
        }
    }
}
